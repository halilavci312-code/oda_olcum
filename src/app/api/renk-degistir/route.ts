import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fal } from "@fal-ai/client";

export const maxDuration = 60;

// ─── Renk prompt eşlemeleri ───
const colorPrompts: Record<string, string> = {
  bej: "beige cream colored",
  antrasit: "dark charcoal anthracite grey colored",
  kiremit: "terracotta taba brown colored",
  zumrut: "deep emerald forest green colored",
};

// ─── Kumaş prompt eşlemeleri ───
const fabricPrompts: Record<string, string> = {
  kadife: "luxurious velvet upholstery with soft plush pile texture and light-catching sheen",
  keten: "natural linen upholstery with visible woven fiber texture and matte organic surface",
  deri: "premium genuine leather upholstery with smooth polished surface and subtle grain",
  sonil: "thick chenille upholstery with plush tufted yarn texture and cozy soft surface",
};

function getLum(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export async function POST(req: NextRequest) {
  try {
    const { job_id, color, fabric } = await req.json();
    if (!job_id) return NextResponse.json({ error: "Job ID eksik" }, { status: 400 });

    const { data: job, error: jobError } = await supabase
      .from("generation_jobs").select("result_url, mask_url").eq("id", job_id).single();

    if (jobError || !job) return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    if (!job.result_url || !job.mask_url)
      return NextResponse.json({ error: "Maske veya sonuç görseli henüz hazır değil." }, { status: 400 });

    // Orijinal seçilmişse direkt döndür
    if (color === "orijinal" && fabric === "orijinal")
      return NextResponse.json({ success: true, result_url: job.result_url });

    const Jimp = (await import("jimp")).default;

    // ── Orijinal mobilya rengini tespit et (renk "orijinal" ise) ──
    let colorText = colorPrompts[color] || "";
    if (!colorText) {
      // Renk orijinal veya bilinmeyen → mobilyanın gerçek rengini tespit et
      try {
        const [resImg, mskImg] = await Promise.all([
          Jimp.read(job.result_url),
          Jimp.read(job.mask_url),
        ]);
        const w = resImg.getWidth(), h = resImg.getHeight();
        if (mskImg.getWidth() !== w || mskImg.getHeight() !== h) mskImg.resize(w, h);

        let rSum = 0, gSum = 0, bSum = 0, cnt = 0;
        for (let y = 0; y < h; y += 4) {
          for (let x = 0; x < w; x += 4) {
            const mp = Jimp.intToRGBA(mskImg.getPixelColor(x, y));
            if (mp.a > 128) {
              const px = Jimp.intToRGBA(resImg.getPixelColor(x, y));
              const lum = getLum(px.r / 255, px.g / 255, px.b / 255);
              if (lum > 0.1 && lum < 0.9) {
                rSum += px.r; gSum += px.g; bSum += px.b; cnt++;
              }
            }
          }
        }
        if (cnt > 0) {
          const hex = `#${Math.round(rSum/cnt).toString(16).padStart(2,"0")}${Math.round(gSum/cnt).toString(16).padStart(2,"0")}${Math.round(bSum/cnt).toString(16).padStart(2,"0")}`;
          colorText = `${hex} colored`;
          console.log("[renk-degistir] Orijinal renk:", hex);
        } else {
          colorText = "same original color";
        }
      } catch {
        colorText = "same original color";
      }
    }

    // ── Kumaş metni ──
    const fabricText = fabricPrompts[fabric] || "";

    // ── Prompt oluştur ──
    const prompt = fabricText
      ? `${colorText} ${fabricText} sofa, exact same shape and proportions, photorealistic furniture, 8k`
      : `${colorText} sofa, exact same shape position and proportions, photorealistic furniture, 8k`;

    console.log("[renk-degistir] Prompt:", prompt);

    // ── Binary mask oluştur (beyaz=değiştir, siyah=koru) ──
    const cutoutImg = await Jimp.read(job.mask_url);
    const resultImg = await Jimp.read(job.result_url);
    const w = resultImg.getWidth(), h = resultImg.getHeight();
    if (cutoutImg.getWidth() !== w || cutoutImg.getHeight() !== h) cutoutImg.resize(w, h);

    const binaryMask = new Jimp(w, h, 0x000000FF);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (Jimp.intToRGBA(cutoutImg.getPixelColor(x, y)).a > 128) {
          binaryMask.setPixelColor(Jimp.rgbaToInt(255, 255, 255, 255), x, y);
        }
      }
    }

    // Mask'ı yükle
    const maskBuf = await binaryMask.getBufferAsync(Jimp.MIME_PNG);
    const maskAb = maskBuf.buffer.slice(maskBuf.byteOffset, maskBuf.byteOffset + maskBuf.byteLength) as ArrayBuffer;
    const maskFile = new File([new Blob([maskAb], { type: "image/png" })], "mask.png", { type: "image/png" });
    const maskUrl = await fal.storage.upload(maskFile);

    // ── Fal AI Inpainting ──
    console.log("[renk-degistir] Fal AI'ya istek gönderiliyor...");
    let aiResultUrl: string;
    try {
      const result = await fal.subscribe("fal-ai/flux-pro/v1/fill", {
        input: {
          image_url: job.result_url,
          mask_url: maskUrl,
          prompt,
          output_format: "jpeg",
        }
      });
      if (!result.data?.images?.[0]) throw new Error("Görsel bulunamadı");
      aiResultUrl = result.data.images[0].url;
    } catch (falErr: any) {
      console.error("[renk-degistir] Fal.ai HATA:", JSON.stringify(falErr, null, 2));
      return NextResponse.json(
        { error: falErr?.body?.detail || falErr?.message || "AI işlemi başarısız" },
        { status: 500 }
      );
    }

    console.log("[renk-degistir] Başarılı:", aiResultUrl);
    return NextResponse.json({ success: true, result_url: aiResultUrl });

  } catch (err: any) {
    console.error("[renk-degistir] Genel Hata:", err?.message || err);
    return NextResponse.json(
      { error: typeof err?.message === "string" ? err.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}
