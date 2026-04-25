import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fal } from "@fal-ai/client";

export const maxDuration = 60;

// ─── Renk Hedefleri ───
const colorTargets: Record<string, { r: number; g: number; b: number }> = {
  orijinal: { r: -1, g: -1, b: -1 }, // Özel durum
  bej: { r: 215 / 255, g: 195 / 255, b: 170 / 255 },
  antrasit: { r: 40 / 255, g: 40 / 255, b: 42 / 255 },
  kiremit: { r: 160 / 255, g: 70 / 255, b: 35 / 255 },
  zumrut: { r: 15 / 255, g: 65 / 255, b: 40 / 255 }, // Koyu ve gerçekçi
};

function getLum(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function recolorChannel(origLum: number, pivot: number, target: number, isLeather: boolean, isVelvet: boolean) {
  if (origLum <= pivot) {
    let scale = origLum / pivot;
    if (isVelvet) scale = Math.pow(scale, 1.2); // Kadife için daha derin gölgeler
    return target * scale;
  } else {
    let scale = (origLum - pivot) / (1 - pivot);
    if (isLeather) scale = Math.pow(scale, 0.7); // Deri için daha parlak parlamalar
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

    // ═══════════════════════════════════════════════════════════
    // DİNAMİK LUMINANCE MAPPING ALGORİTMASI
    // AI inpainting yapıyı bozduğu için tamamen programatik, 
    // ama eskisinden 100x daha gerçekçi bir ışık-gölge haritalama 
    // algoritması yazıldı.
    // ═══════════════════════════════════════════════════════════
    console.log("[renk-degistir] Dinamik Luminance Mapping başlatılıyor...");
    
    // Eğer renk orijinalse ama kumaş değişiyorsa, mevcut rengi korumaya çalışacağız.
    // Ancak orijinal rengi maske içinden hesaplamak zor olduğundan, kumaş değişiminde 
    // eğer renk "orijinal" seçilmişse işlemi pas geçiyoruz (veya hafif bir efekt veriyoruz).
    let targetColor = colorTargets[color] || colorTargets["bej"];
    
    // Eğer sadece kumaş değişimi istenmişse ve renk orijinalse, 
    // şimdilik rengi hafif bej varsayarak doku (deri/kadife) efekti uygulayacağız.
    if (color === "orijinal") {
      targetColor = colorTargets["bej"]; // Varsayılan bir taban renk
    }

    const isLeather = fabric === "deri";
    const isVelvet = fabric === "kadife";

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

    // 1. Pivot Luminance (Ortalama Parlaklık) Hesaplama
    let totalLum = 0;
    let count = 0;
    for (let y = 0; y < h; y += 2) { // Performans için 2'şer atla
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
    console.log("[renk-degistir] Pivot Luminance:", pivot);

    // 2. Piksel Piksel Haritalama
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cutoutPixel = Jimp.intToRGBA(cutoutImage.getPixelColor(x, y));
        if (cutoutPixel.a <= 5) continue; 
        
        const origPixel = Jimp.intToRGBA(resultImage.getPixelColor(x, y));
        
        const origR = origPixel.r / 255;
        const origG = origPixel.g / 255;
        const origB = origPixel.b / 255;

        // Orijinal pikselin parlaklığı
        const origLum = getLum(origR, origG, origB);

        // Kumaş dokusu efekti (Keten için noise)
        let noise = 0;
        if (fabric === "keten") {
          noise = (Math.random() - 0.5) * 0.05; // Hafif kumlanma
        }

        // Yeni renk kanallarını hesapla
        let newR = Math.min(1, Math.max(0, recolorChannel(origLum, pivot, targetColor.r, isLeather, isVelvet) + noise));
        let newG = Math.min(1, Math.max(0, recolorChannel(origLum, pivot, targetColor.g, isLeather, isVelvet) + noise));
        let newB = Math.min(1, Math.max(0, recolorChannel(origLum, pivot, targetColor.b, isLeather, isVelvet) + noise));

        // Eğer renk orijinalse, sadece kumaş efekti (deri parlaması, kadife gölgesi) vermek için 
        // orijinal rengi (origR, origG, origB) kullan.
        if (color === "orijinal") {
           newR = Math.min(1, Math.max(0, recolorChannel(origLum, pivot, origR, isLeather, isVelvet) + noise));
           newG = Math.min(1, Math.max(0, recolorChannel(origLum, pivot, origG, isLeather, isVelvet) + noise));
           newB = Math.min(1, Math.max(0, recolorChannel(origLum, pivot, origB, isLeather, isVelvet) + noise));
        }

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

  } catch (err: any) {
    console.error("[renk-degistir] Hata:", err);
    return NextResponse.json(
      { error: err.message || "Sunucu hatası" },
      { status: 500 }
    );
  }
}
