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

// ─── AI inpainting prompt'ları ───
const aiColorPrompts: Record<string, string> = {
  bej: "beige cream",
  antrasit: "dark charcoal grey",
  kiremit: "terracotta brown",
  zumrut: "deep forest green",
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

// ─── HSL Dönüşüm Fonksiyonları ───
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
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
    // KUMAŞ DEĞİŞİMİ -> INPAINTING + HSL RENK KORUMA
    // 1) Inpainting ile kumaş dokusu üretilir
    // 2) HSL ile orijinal renk (H+S) korunur, AI'dan sadece L (doku) alınır
    // 3) Renk değişimi varsa luminance mapping ile uygulanır
    // ═══════════════════════════════════════════════════════════
    else {
      console.log("[renk-degistir] Kumaş değişimi: Inpainting + HSL renk koruma başlatılıyor...");
      
      const Jimp = (await import("jimp")).default;

      // ── Orijinal mobilya rengini tespit et (HEX olarak) ──
      const [origImg, cutoutImg] = await Promise.all([
        Jimp.read(job.result_url),
        Jimp.read(job.mask_url),
      ]);
      const w = origImg.getWidth();
      const h = origImg.getHeight();
      if (cutoutImg.getWidth() !== w || cutoutImg.getHeight() !== h) {
        cutoutImg.resize(w, h);
      }

      let rSum = 0, gSum = 0, bSum = 0, pxCount = 0;
      for (let y = 0; y < h; y += 4) {
        for (let x = 0; x < w; x += 4) {
          const maskPx = Jimp.intToRGBA(cutoutImg.getPixelColor(x, y));
          if (maskPx.a > 128) {
            const px = Jimp.intToRGBA(origImg.getPixelColor(x, y));
            const lum = getLum(px.r / 255, px.g / 255, px.b / 255);
            if (lum > 0.15 && lum < 0.85) {
              rSum += px.r; gSum += px.g; bSum += px.b;
              pxCount++;
            }
          }
        }
      }
      const avgR = pxCount > 0 ? Math.round(rSum / pxCount) : 180;
      const avgG = pxCount > 0 ? Math.round(gSum / pxCount) : 175;
      const avgB = pxCount > 0 ? Math.round(bSum / pxCount) : 170;
      const hexColor = `#${avgR.toString(16).padStart(2, "0")}${avgG.toString(16).padStart(2, "0")}${avgB.toString(16).padStart(2, "0")}`;

      // ── Prompt: rengi HEX olarak belirt + kumaş dokusu detayları ──
      const colorForPrompt = hasColorChange ? (aiColorPrompts[color] || "") : hexColor;

      const fabricPrompts: Record<string, string> = {
        kadife: "velvet upholstery texture with soft pile, light-catching sheen and gentle fabric folds",
        keten: "linen upholstery with visible woven grain, natural matte fiber texture",
        deri: "leather upholstery with smooth surface, subtle grain pattern and gentle creases",
        sonil: "chenille upholstery with plush tufted yarn texture, soft fuzzy surface",
      };
      const fabricText = fabricPrompts[fabric] || "";

      const prompt = `${colorForPrompt} colored ${fabricText}, same sofa same shape same position, photorealistic, 8k`;
      console.log("[renk-degistir] Prompt:", prompt);

      // ── Binary mask oluştur ──
      const binaryMask = new Jimp(w, h, 0x000000FF);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const px = Jimp.intToRGBA(cutoutImg.getPixelColor(x, y));
          if (px.a > 128) {
            binaryMask.setPixelColor(Jimp.rgbaToInt(255, 255, 255, 255), x, y);
          }
        }
      }

      const maskBuffer = await binaryMask.getBufferAsync(Jimp.MIME_PNG);
      const maskAb = maskBuffer.buffer.slice(maskBuffer.byteOffset, maskBuffer.byteOffset + maskBuffer.byteLength) as ArrayBuffer;
      const maskFile = new File([new Blob([maskAb], { type: "image/png" })], "mask.png", { type: "image/png" });
      const binaryMaskUrl = await fal.storage.upload(maskFile);

      // ── Inpainting ile kumaş dokusu üret ──
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

      console.log("[renk-degistir] AI sonucu alındı, HSL renk koruma başlıyor...");

      // ── HSL Renk Koruma Post-Processing ──
      // Orijinalden H (ton) ve S (doygunluk) al, AI'dan L (parlaklık/doku detayı) al
      // Bu sayede: orijinal renk korunur + kumaş dokusu belirgin olur
      const aiImg = await Jimp.read(aiResultUrl);
      if (aiImg.getWidth() !== w || aiImg.getHeight() !== h) {
        aiImg.resize(w, h);
      }

      // Hedef renk bilgisi (renk değişimi varsa)
      const targetColor = hasColorChange ? colorTargets[color] : null;
      let pivot = 0.5;
      if (targetColor) {
        let totalLum = 0, lumCount = 0;
        for (let y = 0; y < h; y += 2) {
          for (let x = 0; x < w; x += 2) {
            const cp = Jimp.intToRGBA(cutoutImg.getPixelColor(x, y));
            if (cp.a > 128) {
              const op = Jimp.intToRGBA(origImg.getPixelColor(x, y));
              totalLum += getLum(op.r / 255, op.g / 255, op.b / 255);
              lumCount++;
            }
          }
        }
        pivot = lumCount > 0 ? totalLum / lumCount : 0.7;
      }

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const maskPx = Jimp.intToRGBA(cutoutImg.getPixelColor(x, y));
          if (maskPx.a <= 5) continue;

          const origPx = Jimp.intToRGBA(origImg.getPixelColor(x, y));
          const aiPx = Jimp.intToRGBA(aiImg.getPixelColor(x, y));
          const alphaNorm = maskPx.a / 255;

          // Orijinal ve AI piksellerini 0-1 aralığına normalize et
          const oR = origPx.r / 255, oG = origPx.g / 255, oB = origPx.b / 255;
          const aR = aiPx.r / 255, aG = aiPx.g / 255, aB = aiPx.b / 255;

          // HSL dönüşümü
          const [origH, origS, origL] = rgbToHsl(oR, oG, oB);
          const [, , aiL] = rgbToHsl(aR, aG, aB);

          // AI'dan sadece lightness al (doku detayı), renk orijinalden gelsin
          // %80 AI lightness + %20 orijinal lightness = belirgin doku, stabil parlaklık
          const blendedL = Math.min(1, Math.max(0, origL * 0.2 + aiL * 0.8));

          let finalR: number, finalG: number, finalB: number;

          if (targetColor) {
            // Renk + kumaş değişimi: hedef renge luminance mapping uygula, doku AI'dan
            const newLum = getLum(
              ...hslToRgb(origH, origS, blendedL) as [number, number, number]
            );
            finalR = Math.min(1, Math.max(0, recolorChannel(newLum, pivot, targetColor.r)));
            finalG = Math.min(1, Math.max(0, recolorChannel(newLum, pivot, targetColor.g)));
            finalB = Math.min(1, Math.max(0, recolorChannel(newLum, pivot, targetColor.b)));
          } else {
            // Sadece kumaş değişimi: orijinal H+S, AI'dan L
            [finalR, finalG, finalB] = hslToRgb(origH, origS, blendedL);
          }

          // Maske alpha ile yumuşak geçiş
          const outR = Math.round((oR * (1 - alphaNorm) + finalR * alphaNorm) * 255);
          const outG = Math.round((oG * (1 - alphaNorm) + finalG * alphaNorm) * 255);
          const outB = Math.round((oB * (1 - alphaNorm) + finalB * alphaNorm) * 255);

          origImg.setPixelColor(Jimp.rgbaToInt(
            Math.min(255, Math.max(0, outR)),
            Math.min(255, Math.max(0, outG)),
            Math.min(255, Math.max(0, outB)),
            origPx.a
          ), x, y);
        }
      }

      console.log("[renk-degistir] HSL renk koruma tamamlandı, yükleniyor...");

      const buffer = await origImg.getBufferAsync(Jimp.MIME_JPEG);
      const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      const file = new File([new Blob([ab], { type: "image/jpeg" })], "fabric_result.jpg", { type: "image/jpeg" });
      const uploadedUrl = await fal.storage.upload(file);

      return NextResponse.json({ success: true, result_url: uploadedUrl });
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
