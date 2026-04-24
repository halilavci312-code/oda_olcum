import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fal } from "@fal-ai/client";

export const maxDuration = 60;

// Renk -> sadece yüzey rengi tarifi (kısa ve net, obje referansı yok)
const colorPrompts: Record<string, string> = {
  bej: "beige cream",
  antrasit: "dark charcoal grey",
  kiremit: "terracotta brown",
  zumrut: "emerald green",
};

// Kumaş -> sadece yüzey dokusu tarifi (kısa ve net)
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
        { error: "Maske veya sonuç görseli henüz hazır değil. Lütfen n8n akışının maske ürettiğinden emin olun." },
        { status: 400 }
      );
    }

    // Orijinale dönmek isteniyorsa direkt mevcut result_url dön
    if (color === "orijinal" && fabric === "orijinal") {
      return NextResponse.json({ success: true, result_url: job.result_url });
    }

    const colorText = colorPrompts[color] || "";
    const fabricText = fabricPrompts[fabric] || "";
    
    // 2. Maskeyi indirip tersine çevirme (Jimp)
    // Fal AI "White = Inpaint", "Black = Preserve" olarak çalışır.
    // Bria maskesi: beyaz = ürün (foreground), siyah = arka plan.
    // Fal AI fill: beyaz = değişecek alan, siyah = korunacak alan.
    // Yani Bria maskesi zaten doğru yönde olabilir (beyaz = ürün = değişecek).
    // Emin olmak için maskeyi analiz edip doğru yöne çeviriyoruz.
    let processedMaskUrl = job.mask_url;
    try {
      console.log("[renk-degistir] Maske işleniyor...");
      const Jimp = (await import("jimp")).default;
      const maskImage = await Jimp.read(job.mask_url);
      
      // Maskenin beyaz/siyah oranını kontrol et
      // Eğer beyaz alan çoğunlukta ise (>%60), maske tersine çevrilmeli
      // Çünkü mobilya genellikle görüntünün küçük kısmını kaplar
      const width = maskImage.getWidth();
      const height = maskImage.getHeight();
      let whitePixels = 0;
      const totalPixels = width * height;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pixel = Jimp.intToRGBA(maskImage.getPixelColor(x, y));
          // Beyaz piksel sayısı (eşik: 128)
          if (pixel.r > 128 && pixel.g > 128 && pixel.b > 128) {
            whitePixels++;
          }
        }
      }
      
      const whiteRatio = whitePixels / totalPixels;
      console.log(`[renk-degistir] Maske beyaz oranı: ${(whiteRatio * 100).toFixed(1)}%`);
      
      // Beyaz alan çoğunlukta ise ters çevir (arka plan beyaz demektir, ürün siyah)
      if (whiteRatio > 0.6) {
        console.log("[renk-degistir] Maske tersine çevriliyor (beyaz > %60)...");
        maskImage.invert();
      } else {
        console.log("[renk-degistir] Maske doğru yönde, tersine çevirme gerekmez.");
      }
      
      // İşlenmiş maskeyi Fal.ai storage'a yükle (base64 data URI yerine URL kullan)
      const maskBuffer = await maskImage.getBufferAsync(Jimp.MIME_PNG);
      const maskArrayBuffer = maskBuffer.buffer.slice(maskBuffer.byteOffset, maskBuffer.byteOffset + maskBuffer.byteLength) as ArrayBuffer;
      const maskBlob = new Blob([maskArrayBuffer], { type: "image/png" });
      const maskFile = new File([maskBlob], "mask.png", { type: "image/png" });
      processedMaskUrl = await fal.storage.upload(maskFile);
      console.log("[renk-degistir] Maske fal storage'a yüklendi:", processedMaskUrl);
    } catch (err) {
      console.error("[renk-degistir] Maske işlenirken hata oluştu:", err);
      // Hata olursa orijinal URL ile devam et
    }

    // 3. Fal.ai Inpainting İsteği
    // PROMPT STRATEJİSİ: 
    // - Obje/mobilya kelimesi KULLANMA (şekil bozulmasını önler)
    // - Sadece yüzey malzemesi ve rengini tarif et
    // - Kısa ve net ol (metin oluşmasını önler)
    // - "no text" gibi negative ifadeler FLUX'ta çalışmaz, prompt'u sade tut
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
    console.log("[renk-degistir] Fal.ai inpainting başlatılıyor...");
    
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

    const newImageUrl = result.data.images[0].url;

    // (Opsiyonel) Yeni görseli de Supabase'e kaydedebiliriz, ancak frontend şimdilik
    // state üzerinde tutacak. Veya ayrı bir "recolors" tablosuna kaydedilebilir.
    
    return NextResponse.json({
      success: true,
      result_url: newImageUrl
    });

  } catch (err: any) {
    console.error("[renk-degistir] Hata:", err);
    return NextResponse.json(
      { error: err.message || "Sunucu hatası" },
      { status: 500 }
    );
  }
}
