import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fal } from "@fal-ai/client";

export const maxDuration = 60;

// ─── AI inpainting prompt'ları (Kumaş değişimi için) ───
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

// ─── W3C Photoshop Color Blend Mode Yardımcıları ───
// Kaynak: W3C Compositing and Blending Level 1
// Bu algoritma, piksellerin Luminansını (gerçek parlaklığını) %100 koruyarak
// sadece Hue ve Saturation (renk ve doygunluk) değerlerini değiştirir.
// Böylece gölgeler ve aydınlık alanlar yapay zeka olmadan kusursuz korunur.

const colorTargets: Record<string, { r: number; g: number; b: number }> = {
  bej: { r: 215 / 255, g: 195 / 255, b: 170 / 255 },
  antrasit: { r: 50 / 255, g: 50 / 255, b: 52 / 255 },
  kiremit: { r: 180 / 255, g: 80 / 255, b: 40 / 255 },
  zumrut: { r: 20 / 255, g: 100 / 255, b: 60 / 255 },
};

function getLum(r: number, g: number, b: number) {
  return 0.3 * r + 0.59 * g + 0.11 * b;
}

function clipColor(r: number, g: number, b: number) {
  const l = getLum(r, g, b);
  const n = Math.min(r, g, b);
  const x = Math.max(r, g, b);

  let resR = r, resG = g, resB = b;

  if (n < 0) {
    resR = l + ((r - l) * l) / (l - n);
    resG = l + ((g - l) * l) / (l - n);
    resB = l + ((b - l) * l) / (l - n);
  }
  if (x > 1) {
    resR = l + ((r - l) * (1 - l)) / (x - l);
    resG = l + ((g - l) * (1 - l)) / (x - l);
    resB = l + ((b - l) * (1 - l)) / (x - l);
  }
  return { r: resR, g: resG, b: resB };
}

function setLum(r: number, g: number, b: number, targetLum: number) {
  const d = targetLum - getLum(r, g, b);
  return clipColor(r + d, g + d, b + d);
}

// ─── Bria cutout'undan binary maske oluşturma (AI için) ───
async function createBinaryMask(maskUrl: string) {
  const Jimp = (await import("jimp")).default;
  const cutoutImage = await Jimp.read(maskUrl);
  const width = cutoutImage.getWidth();
  const height = cutoutImage.getHeight();

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
  const maskAB = maskBuffer.buffer.slice(
    maskBuffer.byteOffset,
    maskBuffer.byteOffset + maskBuffer.byteLength
  ) as ArrayBuffer;
  const maskFile = new File(
    [new Blob([maskAB], { type: "image/png" })],
    "mask.png",
    { type: "image/png" }
  );
  
  return await fal.storage.upload(maskFile);
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
    // SADECE RENK DEĞİŞİMİ -> PROGRAMATİK W3C BLEND MODE
    // Photoshop'un "Color" katman stili ile birebir aynıdır.
    // Şekil, yastıklar, kırışıklıklar ve gölgeler %100 aynı kalır.
    // ═══════════════════════════════════════════════════════════
    if (!hasFabricChange && hasColorChange) {
      console.log("[renk-degistir] Programatik Color Blend Mode başlatılıyor...");
      
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

      let changedPixels = 0;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const cutoutPixel = Jimp.intToRGBA(cutoutImage.getPixelColor(x, y));
          if (cutoutPixel.a <= 5) continue; // Şeffaf piksel, atla
          
          const origPixel = Jimp.intToRGBA(resultImage.getPixelColor(x, y));
          
          // Orijinal renk 0-1 aralığı
          const origR = origPixel.r / 255;
          const origG = origPixel.g / 255;
          const origB = origPixel.b / 255;

          // Orijinal parlaklık hesapla
          const origLum = getLum(origR, origG, origB);

          // Hedef rengi orijinal parlaklığa (luminans) uyarla
          const newColor = setLum(targetColor.r, targetColor.g, targetColor.b, origLum);

          // Alpha blending ile maske kenarlarını yumuşat (anti-aliasing)
          const alphaNorm = cutoutPixel.a / 255;
          
          const finalR = Math.round((origR * (1 - alphaNorm) + newColor.r * alphaNorm) * 255);
          const finalG = Math.round((origG * (1 - alphaNorm) + newColor.g * alphaNorm) * 255);
          const finalB = Math.round((origB * (1 - alphaNorm) + newColor.b * alphaNorm) * 255);

          const newPixelColor = Jimp.rgbaToInt(finalR, finalG, finalB, origPixel.a);
          resultImage.setPixelColor(newPixelColor, x, y);
          changedPixels++;
        }
      }

      console.log(`[renk-degistir] W3C Blend: ${changedPixels} piksel işlendi`);

      const buffer = await resultImage.getBufferAsync(Jimp.MIME_JPEG);
      const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      const file = new File([new Blob([ab], { type: "image/jpeg" })], "recolored.jpg", { type: "image/jpeg" });
      const uploadedUrl = await fal.storage.upload(file);

      return NextResponse.json({ success: true, result_url: uploadedUrl });
    } 
    // ═══════════════════════════════════════════════════════════
    // KUMAŞ DEĞİŞİMİ -> AI INPAINTING
    // Kumaş değiştiğinde yeni dokular (deri, kadife) üretilmesi
    // gerektiği için üretken yapay zeka (FLUX) kullanılır.
    // ═══════════════════════════════════════════════════════════
    else {
      console.log("[renk-degistir] Binary maske oluşturuluyor (AI için)...");
      const processedMaskUrl = await createBinaryMask(job.mask_url);
      console.log("[renk-degistir] Maske yüklendi:", processedMaskUrl);

      const colorText = colorPrompts[color] || "";
      const fabricText = fabricPrompts[fabric] || "";
      
      let prompt = "";
      if (colorText && fabricText) {
        prompt = `solid ${colorText} ${fabricText} material`;
      } else if (colorText) {
        prompt = `solid ${colorText} color material`;
      } else if (fabricText) {
        prompt = `${fabricText} material`;
      } else {
        prompt = "exact same material";
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

      if (!result.data?.images?.[0]) {
        throw new Error("Fal.ai yanıtında görsel bulunamadı");
      }

      console.log("[renk-degistir] Başarılı:", result.data.images[0].url);
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
