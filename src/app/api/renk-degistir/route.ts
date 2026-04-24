import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fal } from "@fal-ai/client";

export const maxDuration = 60;

// ─── Renk prompt'ları ───
const colorPrompts: Record<string, string> = {
  bej: "beige cream",
  antrasit: "dark charcoal grey",
  kiremit: "terracotta brown",
  zumrut: "emerald green",
};

// ─── Kumaş prompt'ları ───
const fabricPrompts: Record<string, string> = {
  kadife: "velvet",
  keten: "linen",
  deri: "leather",
  sonil: "chenille",
};

// ─── Bria cutout'undan binary maske oluşturma ───
async function createBinaryMask(maskUrl: string) {
  const Jimp = (await import("jimp")).default;
  const cutoutImage = await Jimp.read(maskUrl);
  const width = cutoutImage.getWidth();
  const height = cutoutImage.getHeight();

  // Siyah-beyaz binary maske: beyaz = değişecek, siyah = korunacak
  const binaryMask = new Jimp(width, height, 0x000000FF);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = Jimp.intToRGBA(cutoutImage.getPixelColor(x, y));
      if (pixel.a > 10) {
        binaryMask.setPixelColor(0xFFFFFFFF, x, y);
      }
    }
  }

  // Fal.ai storage'a yükle
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

    // Orijinale dönmek isteniyorsa
    if (color === "orijinal" && fabric === "orijinal") {
      return NextResponse.json({ success: true, result_url: job.result_url });
    }

    // ═══════════════════════════════════════════════════════════
    // AI INPAINTING — Tüm renk ve kumaş değişimleri için
    // AI, malzeme dokusu, ışık yansımaları ve gölgeleri doğal
    // şekilde oluşturur. Binary maske ile yapı korunur.
    // ═══════════════════════════════════════════════════════════

    console.log("[renk-degistir] Binary maske oluşturuluyor...");
    const processedMaskUrl = await createBinaryMask(job.mask_url);
    console.log("[renk-degistir] Maske yüklendi:", processedMaskUrl);

    // Prompt oluştur: Çok sade tutarak AI'ın şekli değiştirmesini (yastık ekleme vb.) önlüyoruz
    // "upholstery" veya "surface" gibi kelimeler kullanmıyoruz ki fazladan doku veya nesne üretmesin
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

  } catch (err: any) {
    console.error("[renk-degistir] Hata:", err);
    return NextResponse.json(
      { error: err.message || "Sunucu hatası" },
      { status: 500 }
    );
  }
}
