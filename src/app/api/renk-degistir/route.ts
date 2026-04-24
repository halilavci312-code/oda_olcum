import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fal } from "@fal-ai/client";

export const maxDuration = 60;

// ─── HSL hedef değerleri (programatik renk değişimi için) ───
// H: 0-1 (hue), S: 0-1 (saturation), lOffset: parlaklık ofseti
const colorHSL: Record<string, { h: number; s: number; lOffset: number }> = {
  bej:      { h: 35 / 360,  s: 0.35,  lOffset: 0.02 },
  antrasit: { h: 0,          s: 0.04,  lOffset: -0.30 },
  kiremit:  { h: 22 / 360,  s: 0.55,  lOffset: -0.05 },
  zumrut:   { h: 155 / 360, s: 0.70,  lOffset: -0.12 },
};

// ─── AI inpainting prompt'ları (sadece kumaş değişiminde kullanılır) ───
const colorPrompts: Record<string, string> = {
  bej: "beige cream",
  antrasit: "dark charcoal grey",
  kiremit: "terracotta brown",
  zumrut: "emerald green",
};

const fabricPrompts: Record<string, string> = {
  kadife: "velvet",
  keten: "linen",
  deri: "leather",
  sonil: "chenille",
};

// ─── HSL Dönüşüm Yardımcıları ───
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
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
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
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
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

export async function POST(req: NextRequest) {
  try {
    const { job_id, color, fabric } = await req.json();

    if (!job_id) {
      return NextResponse.json({ error: "Job ID eksik" }, { status: 400 });
    }

    // 1. Supabase'den Job'ı getir
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

    // Orijinale dönmek isteniyorsa
    if (color === "orijinal" && fabric === "orijinal") {
      return NextResponse.json({ success: true, result_url: job.result_url });
    }

    const hasFabricChange = fabric && fabric !== "orijinal";
    const hasColorChange = color && color !== "orijinal";

    // ════════════════════════════════════════════════════════════════
    // YÖNTEM SEÇİMİ:
    // - Sadece RENK değişimi → Programatik HSL kaydırma (yapı %100 korunur)
    // - KUMAŞ değişimi → AI inpainting (doku değişimi gerektirir)
    // ════════════════════════════════════════════════════════════════

    if (!hasFabricChange && hasColorChange) {
      // ─── PROGRAMMATIK RENK DEĞİŞİMİ ───
      // Avantaj: Yastık sayısı, şekil, gölge, detaylar tamamen korunur
      console.log("[renk-degistir] Programatik HSL renk değişimi başlatılıyor...");
      
      const target = colorHSL[color];
      if (!target) {
        return NextResponse.json({ error: "Geçersiz renk" }, { status: 400 });
      }

      const Jimp = (await import("jimp")).default;
      
      // Sonuç görselini ve cutout'u (maske) yükle
      const [resultImage, cutoutImage] = await Promise.all([
        Jimp.read(job.result_url),
        Jimp.read(job.mask_url),
      ]);

      const w = resultImage.getWidth();
      const h = resultImage.getHeight();

      // Cutout boyutu farklıysa, sonuç görseli boyutuna resize et
      if (cutoutImage.getWidth() !== w || cutoutImage.getHeight() !== h) {
        cutoutImage.resize(w, h);
        console.log(`[renk-degistir] Cutout ${w}x${h} boyutuna resize edildi`);
      }

      let changedPixels = 0;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const cutoutPixel = Jimp.intToRGBA(cutoutImage.getPixelColor(x, y));
          
          // Alpha > 10 ise bu piksel mobilyanın parçası
          if (cutoutPixel.a > 10) {
            const origPixel = Jimp.intToRGBA(resultImage.getPixelColor(x, y));
            const [, , origL] = rgbToHsl(origPixel.r, origPixel.g, origPixel.b);

            // Hedef HSL: Hue ve Saturation hedeften, Lightness orijinalden (+ offset)
            const newL = Math.max(0, Math.min(1, origL + target.lOffset));
            const [nr, ng, nb] = hslToRgb(target.h, target.s, newL);

            const newColor = Jimp.rgbaToInt(nr, ng, nb, origPixel.a);
            resultImage.setPixelColor(newColor, x, y);
            changedPixels++;
          }
        }
      }

      console.log(`[renk-degistir] ${changedPixels} piksel renk değiştirildi`);

      // Sonucu fal.ai storage'a yükle
      const buffer = await resultImage.getBufferAsync(Jimp.MIME_JPEG);
      const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: "image/jpeg" });
      const file = new File([blob], "recolored.jpg", { type: "image/jpeg" });
      const uploadedUrl = await fal.storage.upload(file);

      console.log("[renk-degistir] Programatik renk değişimi tamamlandı:", uploadedUrl);
      return NextResponse.json({ success: true, result_url: uploadedUrl });

    } else {
      // ─── AI INPAINTING (Kumaş değişimi) ───
      console.log("[renk-degistir] AI inpainting başlatılıyor (kumaş değişimi)...");

      const Jimp = (await import("jimp")).default;
      const cutoutImage = await Jimp.read(job.mask_url);
      const width = cutoutImage.getWidth();
      const height = cutoutImage.getHeight();

      // Alpha kanalından binary maske oluştur
      const binaryMask = new Jimp(width, height, 0x000000FF);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pixel = Jimp.intToRGBA(cutoutImage.getPixelColor(x, y));
          if (pixel.a > 10) {
            binaryMask.setPixelColor(0xFFFFFFFF, x, y);
          }
        }
      }

      const maskBuffer = await binaryMask.getBufferAsync(Jimp.MIME_PNG);
      const maskAB = maskBuffer.buffer.slice(maskBuffer.byteOffset, maskBuffer.byteOffset + maskBuffer.byteLength) as ArrayBuffer;
      const maskBlob = new Blob([maskAB], { type: "image/png" });
      const maskFile = new File([maskBlob], "mask.png", { type: "image/png" });
      const processedMaskUrl = await fal.storage.upload(maskFile);

      const colorText = colorPrompts[color] || "";
      const fabricText = fabricPrompts[fabric] || "";
      
      let prompt = "";
      if (colorText && fabricText) {
        prompt = `${colorText} ${fabricText} upholstery surface texture`;
      } else if (colorText) {
        prompt = `${colorText} fabric upholstery surface`;
      } else if (fabricText) {
        prompt = `${fabricText} upholstery surface texture`;
      } else {
        prompt = "same upholstery surface";
      }

      console.log("[renk-degistir] Prompt:", prompt);
      
      const result = await fal.subscribe("fal-ai/flux-pro/v1/fill", {
        input: {
          prompt,
          image_url: job.result_url,
          mask_url: processedMaskUrl,
          output_format: "jpeg",
          safety_tolerance: "6",
        }
      });

      if (!result.data || !result.data.images || !result.data.images[0]) {
        throw new Error("Fal.ai yanıtında görsel bulunamadı");
      }

      return NextResponse.json({
        success: true,
        result_url: result.data.images[0].url,
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
