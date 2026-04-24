import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fal } from "@fal-ai/client";

export const maxDuration = 60;

// ─── Hedef RGB renkleri (Luminans tabanlı renk eşleme için) ───
// r,g,b: hedef rengin orta ton değeri
// blend: orijinal ile karışım oranı (1.0 = tamamen yeni renk, 0.5 = %50 karışım)
const colorTargetRGB: Record<string, { r: number; g: number; b: number; blend: number }> = {
  bej:      { r: 205, g: 185, b: 155, blend: 0.78 },
  antrasit: { r: 50,  g: 50,  b: 52,  blend: 0.82 },
  kiremit:  { r: 170, g: 95,  b: 50,  blend: 0.78 },
  zumrut:   { r: 10,  g: 90,  b: 60,  blend: 0.78 },
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
    // - Sadece RENK → Luminans tabanlı renk eşleme (yapı %100 korunur)
    // - KUMAŞ değişimi → AI inpainting (doku değişimi gerektirir)
    // ════════════════════════════════════════════════════════════════

    if (!hasFabricChange && hasColorChange) {
      // ─── PROGRAMMATIK RENK DEĞİŞİMİ (Luminans tabanlı) ───
      // Gölgeler koyu kalır, aydınlık yerler açık kalır, doku korunur
      console.log("[renk-degistir] Luminans tabanlı renk değişimi başlatılıyor...");
      
      const target = colorTargetRGB[color];
      if (!target) {
        return NextResponse.json({ error: "Geçersiz renk" }, { status: 400 });
      }

      // Hedef rengin luminansını hesapla
      const targetLum = 0.299 * target.r + 0.587 * target.g + 0.114 * target.b;

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

      let changedPixels = 0;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const cutoutPixel = Jimp.intToRGBA(cutoutImage.getPixelColor(x, y));
          
          if (cutoutPixel.a <= 10) continue; // Şeffaf piksel, atla
          
          const origPixel = Jimp.intToRGBA(resultImage.getPixelColor(x, y));
          
          // Orijinal pikselin luminansını hesapla
          const origLum = 0.299 * origPixel.r + 0.587 * origPixel.g + 0.114 * origPixel.b;
          
          // Luminans oranı ile hedef rengi ölçeklendir
          // Bu sayede gölgeler koyu, aydınlık yerler açık kalır
          const ratio = origLum / Math.max(targetLum, 1);
          
          let newR = Math.round(target.r * ratio);
          let newG = Math.round(target.g * ratio);
          let newB = Math.round(target.b * ratio);
          
          // Clamp 0-255
          newR = Math.min(255, Math.max(0, newR));
          newG = Math.min(255, Math.max(0, newG));
          newB = Math.min(255, Math.max(0, newB));
          
          // Alpha kanalını kullanarak yumuşak kenar geçişi sağla
          const alphaNorm = cutoutPixel.a / 255;
          const blendStrength = target.blend * alphaNorm;
          
          // Orijinal ile yeni rengi karıştır
          const finalR = Math.round(origPixel.r * (1 - blendStrength) + newR * blendStrength);
          const finalG = Math.round(origPixel.g * (1 - blendStrength) + newG * blendStrength);
          const finalB = Math.round(origPixel.b * (1 - blendStrength) + newB * blendStrength);

          const newColor = Jimp.rgbaToInt(finalR, finalG, finalB, origPixel.a);
          resultImage.setPixelColor(newColor, x, y);
          changedPixels++;
        }
      }

      console.log(`[renk-degistir] ${changedPixels} piksel renk değiştirildi`);

      // Sonucu fal.ai storage'a yükle
      const buffer = await resultImage.getBufferAsync(Jimp.MIME_JPEG);
      const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: "image/jpeg" });
      const file = new File([blob], "recolored.jpg", { type: "image/jpeg" });
      const uploadedUrl = await fal.storage.upload(file);

      console.log("[renk-degistir] Renk değişimi tamamlandı:", uploadedUrl);
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
