import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fal } from "@fal-ai/client";

export const maxDuration = 60;

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
    // KUMAŞ DEĞİŞİMİ -> INPAINTING (flux-pro/v1/fill)
    // Mask tabanlı inpainting ile sadece mobilya alanı değişir,
    // oda ve mobilya yapısı (şekil, gölge, perspektif) %100 korunur.
    // ═══════════════════════════════════════════════════════════
    else {
      console.log("[renk-degistir] Kumaş değişimi tespit edildi. Inpainting (fill) başlatılıyor...");
      
      const Jimp = (await import("jimp")).default;

      // ── Renk metni oluştur ──
      let colorText = aiColorPrompts[color] || "";
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
            colorText = "same original color";
          }
        } catch(e) {
          console.warn("Renk tespiti yapılamadı:", e);
          colorText = "same original color";
        }
      }

      // ── Detaylı kumaş dokusu prompt'ları ──
      const detailedFabricPrompts: Record<string, string> = {
        kadife: "luxurious velvet upholstery with soft plush texture, visible velvet pile and light-catching sheen, subtle fabric folds with gentle shadows",
        keten: "natural linen upholstery with visible woven texture and organic grain, slightly textured matte surface with natural fiber details",
        deri: "premium genuine leather upholstery with smooth surface, subtle leather grain pattern, natural leather creases and gentle reflections",
        sonil: "thick chenille upholstery with plush tufted texture, soft fuzzy surface with visible yarn loops, cozy fabric depth",
      };
      const fabricText = detailedFabricPrompts[fabric] || "";

      const prompt = `The exact same sofa with ${colorText} ${fabricText} material, maintaining identical shape, position, proportions, and shadows, photorealistic furniture photography, 8k detail`;

      console.log("[renk-degistir] Inpainting Prompt:", prompt);

      // ── ADIM 1: Alpha mask'ı binary siyah-beyaz mask'a dönüştür ──
      // flux-pro/v1/fill modeli: beyaz = inpaint edilecek alan, siyah = korunacak alan
      const cutoutImg = await Jimp.read(job.mask_url);
      const resultImg = await Jimp.read(job.result_url);
      const w = resultImg.getWidth();
      const h = resultImg.getHeight();

      // Binary mask oluştur (aynı boyutta)
      const binaryMask = new Jimp(w, h, 0x000000FF); // siyah başlangıç (korunacak)
      if (cutoutImg.getWidth() !== w || cutoutImg.getHeight() !== h) {
        cutoutImg.resize(w, h);
      }

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const px = Jimp.intToRGBA(cutoutImg.getPixelColor(x, y));
          if (px.a > 128) {
            // Mobilya alanı → beyaz (inpaint edilecek)
            binaryMask.setPixelColor(Jimp.rgbaToInt(255, 255, 255, 255), x, y);
          }
        }
      }

      // Mask'ı Fal storage'a yükle
      const maskBuffer = await binaryMask.getBufferAsync(Jimp.MIME_PNG);
      const maskAb = maskBuffer.buffer.slice(maskBuffer.byteOffset, maskBuffer.byteOffset + maskBuffer.byteLength) as ArrayBuffer;
      const maskFile = new File([new Blob([maskAb], { type: "image/png" })], "binary_mask.png", { type: "image/png" });
      const binaryMaskUrl = await fal.storage.upload(maskFile);

      console.log("[renk-degistir] Binary mask oluşturuldu ve yüklendi.");

      // ── ADIM 2: flux-pro/v1/fill ile inpainting ──
      let aiResultUrl: string;
      try {
        const result = await fal.subscribe("fal-ai/flux-pro/v1/fill", {
          input: {
            image_url: job.result_url,
            mask_url: binaryMaskUrl,
            prompt,
            output_format: "jpeg",
          }
        });

        if (!result.data?.images?.[0]) {
          throw new Error("Fal.ai yanıtında görsel bulunamadı");
        }
        aiResultUrl = result.data.images[0].url;
      } catch (falErr: any) {
        console.error("[renk-degistir] Fal.ai HATA:", JSON.stringify(falErr, null, 2));
        const msg = falErr?.body?.detail || falErr?.message || "Kumaş üretimi başarısız";
        return NextResponse.json({ error: msg }, { status: 500 });
      }

      console.log("[renk-degistir] Inpainting tamamlandı, yükleniyor...");

      return NextResponse.json({
        success: true,
        result_url: aiResultUrl,
      });
    }

  } catch (err: any) {
    console.error("[renk-degistir] Genel Hata:", err?.message || err);
    const errorMsg = typeof err?.message === "string" ? err.message : "Sunucu hatası";
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
