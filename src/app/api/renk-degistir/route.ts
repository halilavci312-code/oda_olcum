import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fal } from "@fal-ai/client";

export const maxDuration = 60;

// Renk + Kumaş -> İngilizce prompt mapping
const colorPrompts: Record<string, string> = {
  bej: "warm beige cream colored",
  antrasit: "dark anthracite charcoal grey",
  kiremit: "warm terracotta brown taba",
  zumrut: "rich emerald dark green",
};

const fabricPrompts: Record<string, string> = {
  kadife: "luxurious velvet fabric with soft sheen and plush texture",
  keten: "natural linen fabric with woven texture",
  deri: "premium genuine leather with realistic grain and subtle shine",
  sonil: "soft chenille fabric with plush woven loops",
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
    
    // 2. Fal.ai Inpainting İsteği
    const prompt = `Furniture upholstery in ${colorText} ${fabricText}, photorealistic, same lighting and perspective, high quality texture detail`;
    
    console.log("[renk-degistir] Fal.ai inpainting başlatılıyor...");
    const result = await fal.subscribe("fal-ai/flux-general/inpainting", {
      input: {
        prompt,
        image_url: job.result_url,
        mask_url: job.mask_url,
        strength: 0.85,
        num_inference_steps: 20,
        image_size: "square",
        output_format: "jpeg"
      }
    });
    
    if (!result.data || !result.data.images || !result.data.images[0]) {
       throw new Error("Fal.ai yanıtında görsel bulunamadı");
    }

    const newImageUrl = result.data.images[0].url;

    // 3. (Opsiyonel) Yeni görseli de Supabase'e kaydedebiliriz, ancak frontend şimdilik
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
