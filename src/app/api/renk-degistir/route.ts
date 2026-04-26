import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fal } from "@fal-ai/client";

export const maxDuration = 120;

// ─── Renk Hedefleri ───
const colorTargets: Record<string, { r: number; g: number; b: number }> = {
  orijinal: { r: -1, g: -1, b: -1 },
  bej: { r: 215 / 255, g: 195 / 255, b: 170 / 255 },
  antrasit: { r: 40 / 255, g: 40 / 255, b: 42 / 255 },
  kiremit: { r: 160 / 255, g: 70 / 255, b: 35 / 255 },
  zumrut: { r: 15 / 255, g: 65 / 255, b: 40 / 255 },
};

// ─── AI inpainting prompt'ları (Kumaş değişimi için) ───
const aiColorPrompts: Record<string, string> = {
  bej: "beige cream",
  antrasit: "dark charcoal grey",
  kiremit: "terracotta brown",
  zumrut: "deep forest green",
};

const aiFabricPrompts: Record<string, string> = {
  kadife: "velvet",
  keten: "linen",
  deri: "leather",
  sonil: "chenille",
};

function getLum(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function recolorChannel(origLum: number, pivot: number, target: number) {
  if (origLum <= pivot) {
    const scale = origLum / pivot;
    return target * scale;
  } else {
    const scale = (origLum - pivot) / (1 - pivot);
    return target + (1 - target) * scale;
  }
}



export async function POST(req: NextRequest) {
  try {
    const { job_id, color, fabric } = await req.json();

    if (!job_id) {
      return NextResponse.json({ error: "Job ID eksik" }, { status: 400 });
    }

    const { data: job, error: jobError } = await supabase
      .from("generation_jobs")
      .select("result_url, mask_url")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    if (!job.result_url || !job.mask_url) {
      return NextResponse.json(
        { error: "Maske veya sonuç görseli henüz hazır değil." },
        { status: 400 }
      );
    }

    if (color === "orijinal" && fabric === "orijinal") {
      return NextResponse.json({ success: true, result_url: job.result_url });
    }

    const hasFabricChange = fabric && fabric !== "orijinal";
    const hasColorChange = color && color !== "orijinal";

    // ═══════════════════════════════════════════════════════════
    // KUMAŞ DEĞİŞİMİ YOKSA -> DİNAMİK LUMINANCE MAPPING (PROGRAMATİK)
    // Sadece renk değişiyorsa %100 yapıyı koruyan algoritma çalışır.
    // ═══════════════════════════════════════════════════════════
    if (!hasFabricChange) {
      console.log("[renk-degistir] Programatik Luminance Mapping başlatılıyor...");
      
      const targetColor = colorTargets[color];
      if (!targetColor) {
        return NextResponse.json({ error: "Geçersiz renk" }, { status: 400 });
      }

      const Jimp = (await import("jimp")).default;
      const [resultImage, cutoutImage] = await Promise.all([
        Jimp.read(job.result_url),
        Jimp.read(job.mask_url),
      ]);

      const w = resultImage.getWidth();
      const h = resultImage.getHeight();

      if (cutoutImage.getWidth() !== w || cutoutImage.getHeight() !== h) {
        cutoutImage.resize(w, h);
      }

      let totalLum = 0;
      let count = 0;
      for (let y = 0; y < h; y += 2) { 
        for (let x = 0; x < w; x += 2) {
          const cutoutPixel = Jimp.intToRGBA(cutoutImage.getPixelColor(x, y));
          if (cutoutPixel.a > 128) {
            const origPixel = Jimp.intToRGBA(resultImage.getPixelColor(x, y));
            totalLum += getLum(origPixel.r / 255, origPixel.g / 255, origPixel.b / 255);
            count++;
          }
        }
      }
      const pivot = count > 0 ? (totalLum / count) : 0.7;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const cutoutPixel = Jimp.intToRGBA(cutoutImage.getPixelColor(x, y));
          if (cutoutPixel.a <= 5) continue; 
          
          const origPixel = Jimp.intToRGBA(resultImage.getPixelColor(x, y));
          
          const origR = origPixel.r / 255;
          const origG = origPixel.g / 255;
          const origB = origPixel.b / 255;

          const origLum = getLum(origR, origG, origB);

          const newR = Math.min(1, Math.max(0, recolorChannel(origLum, pivot, targetColor.r)));
          const newG = Math.min(1, Math.max(0, recolorChannel(origLum, pivot, targetColor.g)));
          const newB = Math.min(1, Math.max(0, recolorChannel(origLum, pivot, targetColor.b)));

          const alphaNorm = cutoutPixel.a / 255;
          
          const finalR = Math.round((origR * (1 - alphaNorm) + newR * alphaNorm) * 255);
          const finalG = Math.round((origG * (1 - alphaNorm) + newG * alphaNorm) * 255);
          const finalB = Math.round((origB * (1 - alphaNorm) + newB * alphaNorm) * 255);

          const newPixelColor = Jimp.rgbaToInt(finalR, finalG, finalB, origPixel.a);
          resultImage.setPixelColor(newPixelColor, x, y);
        }
      }

      const buffer = await resultImage.getBufferAsync(Jimp.MIME_JPEG);
      const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      const file = new File([new Blob([ab], { type: "image/jpeg" })], "recolored.jpg", { type: "image/jpeg" });
      const uploadedUrl = await fal.storage.upload(file);

      return NextResponse.json({ success: true, result_url: uploadedUrl });
    }
    // ═══════════════════════════════════════════════════════════
    // KUMAŞ DEĞİŞİMİ -> CONTROLNET DEPTH + JIMP COMPOSITING
    // ControlNet Depth ile koltuğun 3D yapısı korunarak kumaş üretilir.
    // Ardından Jimp ile sadece koltuk kesilip orijinal odaya yapıştırılır.
    // ═══════════════════════════════════════════════════════════
    else {
      console.log("[renk-degistir] Kumaş değişimi tespit edildi. ControlNet Depth + Compositing başlatılıyor...");
      
      let colorText = aiColorPrompts[color] || "";

      // Eğer renk "orijinal" seçilmişse, resmin orijinal rengini (RGB) tespit et
      // Bu sayede AI kafasına göre sarı/yeşil uydurmaz!
      const Jimp = (await import("jimp")).default;
      
      if (color === "orijinal") {
        try {
          const [resImg, mskImg] = await Promise.all([
            Jimp.read(job.result_url),
            Jimp.read(job.mask_url),
          ]);
          
          let rSum = 0, gSum = 0, bSum = 0, pxCount = 0;
          const w = resImg.getWidth(), h = resImg.getHeight();
          if (mskImg.getWidth() === w && mskImg.getHeight() === h) {
            for (let y = 0; y < h; y += 4) { 
              for (let x = 0; x < w; x += 4) {
                const maskPx = Jimp.intToRGBA(mskImg.getPixelColor(x, y));
                if (maskPx.a > 128) {
                  const origPx = Jimp.intToRGBA(resImg.getPixelColor(x, y));
                  // Orta tonları al (çok siyah veya çok beyazları dışla)
                  const lum = getLum(origPx.r/255, origPx.g/255, origPx.b/255);
                  if (lum > 0.15 && lum < 0.85) {
                    rSum += origPx.r; gSum += origPx.g; bSum += origPx.b;
                    pxCount++;
                  }
                }
              }
            }
          }
          if (pxCount > 0) {
            const avgR = Math.round(rSum / pxCount);
            const avgG = Math.round(gSum / pxCount);
            const avgB = Math.round(bSum / pxCount);
            colorText = `rgb(${avgR}, ${avgG}, ${avgB}) colored`;
            console.log("[renk-degistir] Orijinal renk tespit edildi:", colorText);
          } else {
            colorText = "original base color";
          }
        } catch(e) {
          console.warn("Renk tespiti yapılamadı:", e);
          colorText = "original base color";
        }
      }

      const fabricText = aiFabricPrompts[fabric] || "";
      
      const prompt = `a highly detailed solid ${colorText} ${fabricText} sofa, photorealistic, studio lighting`;

      console.log("[renk-degistir] Prompt:", prompt);
      
      // ── ADIM 1: Orijinal resmin boyutlarını al ──
      const origImage = await Jimp.read(job.result_url);
      const origW = origImage.getWidth();
      const origH = origImage.getHeight();
      console.log(`[renk-degistir] Orijinal boyut: ${origW}x${origH}`);

      // ── ADIM 2: ControlNet Depth ile yapı-korumalı kumaş üretimi ──
      // flux-control-lora-depth → derinlik haritası otomatik çıkartılır
      // ve AI bu 3D yapıya bağlı kalarak yeni kumaş dokusu üretir.
      const result = await fal.subscribe("fal-ai/flux-control-lora-depth", {
        input: {
          prompt,
          control_lora_image_url: job.result_url,
          control_lora_strength: 0.85,
          preprocess_depth: true,
          image_size: { width: origW, height: origH },
          num_inference_steps: 28,
          guidance_scale: 3.5,
          output_format: "jpeg",
          enable_safety_checker: false,
        }
      });

      if (!result.data?.images?.[0]) {
        throw new Error("Fal.ai yanıtında görsel bulunamadı");
      }

      const aiResultUrl = result.data.images[0].url;
      console.log("[renk-degistir] AI sonucu alındı, compositing başlıyor...");

      // ── ADIM 3: Jimp Compositing — AI sonucundan sadece koltuğu kes, orijinal odaya yapıştır ──
      // Bu sayede arka plan %100 orijinal kalır.
      const [aiImage, maskImage] = await Promise.all([
        Jimp.read(aiResultUrl),
        Jimp.read(job.mask_url),
      ]);

      // Boyutları orijinale eşitle
      if (aiImage.getWidth() !== origW || aiImage.getHeight() !== origH) {
        aiImage.resize(origW, origH);
      }
      if (maskImage.getWidth() !== origW || maskImage.getHeight() !== origH) {
        maskImage.resize(origW, origH);
      }

      // Maske ile compositing: maske alanı → AI pikseli, dışı → orijinal piksel
      for (let y = 0; y < origH; y++) {
        for (let x = 0; x < origW; x++) {
          const maskPixel = Jimp.intToRGBA(maskImage.getPixelColor(x, y));
          
          if (maskPixel.a > 128) {
            // Maske alanı (koltuk) → AI sonucunun pikselini kullan
            // Kenar yumuşatma: alpha 128-255 arasında smooth blending
            const alphaNorm = Math.min(1, (maskPixel.a - 128) / 127);
            
            if (alphaNorm >= 0.95) {
              // Tam maske alanı → doğrudan AI pikseli
              origImage.setPixelColor(aiImage.getPixelColor(x, y), x, y);
            } else {
              // Kenar bölgesi → AI ve orijinal pikseli blend et
              const aiPx = Jimp.intToRGBA(aiImage.getPixelColor(x, y));
              const origPx = Jimp.intToRGBA(origImage.getPixelColor(x, y));
              
              const blendR = Math.round(origPx.r * (1 - alphaNorm) + aiPx.r * alphaNorm);
              const blendG = Math.round(origPx.g * (1 - alphaNorm) + aiPx.g * alphaNorm);
              const blendB = Math.round(origPx.b * (1 - alphaNorm) + aiPx.b * alphaNorm);
              
              origImage.setPixelColor(Jimp.rgbaToInt(blendR, blendG, blendB, 255), x, y);
            }
          }
          // maskPixel.a <= 128 → orijinal piksel dokunulmadan kalır (arka plan korunur)
        }
      }

      console.log("[renk-degistir] Compositing tamamlandı, yükleniyor...");

      // Sonucu fal storage'a yükle
      const buffer = await origImage.getBufferAsync(Jimp.MIME_JPEG);
      const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      const file = new File([new Blob([ab], { type: "image/jpeg" })], "fabric_result.jpg", { type: "image/jpeg" });
      const uploadedUrl = await fal.storage.upload(file);

      return NextResponse.json({
        success: true,
        result_url: uploadedUrl,
      });
    }

  } catch (err: any) {
    console.error("[renk-degistir] Hata:", err);
    return NextResponse.json(
      { error: err.message || "Sunucu hatası" },
      { status: 500 }
    );
  }
}
