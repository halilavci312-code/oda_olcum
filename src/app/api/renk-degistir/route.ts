import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fal } from "@fal-ai/client";

export const maxDuration = 60;

// ─── GRADIENT MAP RENKLERİ ───
// Her renk için gölge (shadow), orta ton (mid), parlak (highlight) RGB değerleri
// Parlaklık 0→255 arasında bu gradient üzerinde interpolasyon yapılır
type GradientStop = { r: number; g: number; b: number };
type ColorGradient = {
  shadow: GradientStop;    // Koyu alanlar (kıvrımlar, altlar)
  mid: GradientStop;       // Orta tonlar (ana yüzey)
  highlight: GradientStop; // Parlak alanlar (ışık vuran yerler)
  blend: number;           // Orijinal ile karışım oranı (0.7-0.85 arası ideal)
};

const colorGradients: Record<string, ColorGradient> = {
  bej: {
    shadow:    { r: 95,  g: 78,  b: 55  },
    mid:       { r: 195, g: 175, b: 148 },
    highlight: { r: 235, g: 225, b: 210 },
    blend: 0.78,
  },
  antrasit: {
    shadow:    { r: 12,  g: 12,  b: 14  },
    mid:       { r: 52,  g: 52,  b: 55  },
    highlight: { r: 100, g: 100, b: 105 },
    blend: 0.82,
  },
  kiremit: {
    shadow:    { r: 65,  g: 28,  b: 10  },
    mid:       { r: 165, g: 90,  b: 45  },
    highlight: { r: 215, g: 170, b: 130 },
    blend: 0.78,
  },
  zumrut: {
    shadow:    { r: 3,   g: 32,  b: 20  },
    mid:       { r: 12,  g: 82,  b: 52  },
    highlight: { r: 90,  g: 160, b: 128 },
    blend: 0.78,
  },
};

// ─── AI inpainting prompt'ları (kumaş değişiminde) ───
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

// ─── Gradient interpolasyon: parlaklık → renk ───
function gradientMap(luminance: number, gradient: ColorGradient): GradientStop {
  // luminance: 0-255 → t: 0-1
  const t = luminance / 255;
  
  let from: GradientStop, to: GradientStop, factor: number;
  
  if (t < 0.5) {
    // Shadow → Mid arası
    from = gradient.shadow;
    to = gradient.mid;
    factor = t / 0.5;
  } else {
    // Mid → Highlight arası
    from = gradient.mid;
    to = gradient.highlight;
    factor = (t - 0.5) / 0.5;
  }

  return {
    r: Math.round(from.r + (to.r - from.r) * factor),
    g: Math.round(from.g + (to.g - from.g) * factor),
    b: Math.round(from.b + (to.b - from.b) * factor),
  };
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

    if (!hasFabricChange && hasColorChange) {
      // ═══════════════════════════════════════════════════════════
      // GRADIENT MAP RENK DEĞİŞİMİ
      // Photoshop "Gradient Map" tekniği:
      // 1. Her pikselin parlaklığını hesapla
      // 2. Bu parlaklığı hedef renk gradientinde bir renge eşle
      // 3. Orijinal ile karıştırarak doğal doku korunsun
      // Avantaj: Gölgeler koyu ton, açık yerler açık ton olur
      // ═══════════════════════════════════════════════════════════
      console.log("[renk-degistir] Gradient Map renk değişimi başlatılıyor...");
      
      const gradient = colorGradients[color];
      if (!gradient) {
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
          if (cutoutPixel.a <= 10) continue;
          
          const orig = Jimp.intToRGBA(resultImage.getPixelColor(x, y));
          
          // Pikselin parlaklığını hesapla (ITU-R BT.601)
          const luminance = 0.299 * orig.r + 0.587 * orig.g + 0.114 * orig.b;
          
          // Gradient map ile hedef rengi bul
          const mapped = gradientMap(luminance, gradient);
          
          // Alpha ile yumuşak kenar geçişi
          const alphaNorm = cutoutPixel.a / 255;
          const blendStrength = gradient.blend * alphaNorm;
          
          // Orijinal ile karıştır (doku korunsun)
          const finalR = Math.round(orig.r * (1 - blendStrength) + mapped.r * blendStrength);
          const finalG = Math.round(orig.g * (1 - blendStrength) + mapped.g * blendStrength);
          const finalB = Math.round(orig.b * (1 - blendStrength) + mapped.b * blendStrength);

          resultImage.setPixelColor(Jimp.rgbaToInt(finalR, finalG, finalB, orig.a), x, y);
          changedPixels++;
        }
      }

      console.log(`[renk-degistir] Gradient Map: ${changedPixels} piksel işlendi`);

      const buffer = await resultImage.getBufferAsync(Jimp.MIME_JPEG);
      const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      const file = new File([new Blob([ab], { type: "image/jpeg" })], "recolored.jpg", { type: "image/jpeg" });
      const uploadedUrl = await fal.storage.upload(file);

      return NextResponse.json({ success: true, result_url: uploadedUrl });

    } else {
      // ═══════════════════════════════════════════════════════════
      // AI INPAINTING (Kumaş değişimi)
      // ═══════════════════════════════════════════════════════════
      console.log("[renk-degistir] AI inpainting (kumaş değişimi)...");

      const Jimp = (await import("jimp")).default;
      const cutoutImage = await Jimp.read(job.mask_url);
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
      const maskAB = maskBuffer.buffer.slice(maskBuffer.byteOffset, maskBuffer.byteOffset + maskBuffer.byteLength) as ArrayBuffer;
      const maskFile = new File([new Blob([maskAB], { type: "image/png" })], "mask.png", { type: "image/png" });
      const processedMaskUrl = await fal.storage.upload(maskFile);

      const colorText = colorPrompts[color] || "";
      const fabricText = fabricPrompts[fabric] || "";
      
      let prompt = "";
      if (colorText && fabricText) prompt = `${colorText} ${fabricText} upholstery surface texture`;
      else if (colorText) prompt = `${colorText} fabric upholstery surface`;
      else if (fabricText) prompt = `${fabricText} upholstery surface texture`;
      else prompt = "same upholstery surface";

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

      return NextResponse.json({ success: true, result_url: result.data.images[0].url });
    }

  } catch (err: any) {
    console.error("[renk-degistir] Hata:", err);
    return NextResponse.json({ error: err.message || "Sunucu hatası" }, { status: 500 });
  }
}
