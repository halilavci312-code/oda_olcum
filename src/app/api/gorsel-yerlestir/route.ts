import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const maxDuration = 120;

const N8N_WEBHOOK_URL = "https://n8n.halilavc.com/webhook/odanda-gor";

const textureMap: Record<string, string> = {
  // ─── Kumaşlar ───
  "kadife": "high quality velvet fabric texture, soft lighting, vibrant, photorealistic upholstery",
  "keten": "natural linen fabric texture, woven pattern, subtle fabric imperfections, highly detailed",
  "deri": "premium genuine leather, slight shine, highly detailed authentic leather grain and reflections",
  "sonil": "luxurious chenille fabric texture, soft plush woven loops, cozy tactile surface, highly detailed",

  // ─── Renkler ───
  "bej": "warm beige, light cream, soft neutral tone",
  "antrasit": "dark anthracite grey, deep charcoal, modern matte finish",
  "kiremit": "terracotta brown, warm taba tan, earthy burnt sienna tone",
  "zumrut": "rich emerald green, deep jewel-toned green, elegant dark green"
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[proxy] Gelen istek:", JSON.stringify(body));

    const { oda_resim_url, urun_resim_url, color, fabric } = body;

    if (!oda_resim_url || !urun_resim_url) {
      return NextResponse.json({ error: "Oda veya Ürün görseli eksik" }, { status: 400 });
    }

    // Haritalama işlemi — Türkçe seçimi İngilizce prompt'a çevir
    const colorPrompt = textureMap[color] || "";
    const fabricPrompt = textureMap[fabric] || "";

    // Birleşik prompt: renk + kumaş
    const parts: string[] = [];
    if (colorPrompt) parts.push(colorPrompt);
    if (fabricPrompt) parts.push(fabricPrompt);
    const combinedPrompt = parts.join(", ");

    // 1. Supabase'e Job oluştur (texture_prompt dahil)
    const { data: job, error: insertError } = await supabase
      .from("generation_jobs")
      .insert({
        status: "processing",
        room_image: oda_resim_url,
        product_image: urun_resim_url,
        color: color || null,
        fabric: fabric || null,
        texture_prompt: combinedPrompt || null
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json({ error: "Veritabanına iş oluşturulamadı" }, { status: 500 });
    }

    const n8nPayload = {
      job_id: job.id,
      oda_resim_url,
      urun_resim_url,
      texture_prompt: combinedPrompt
    };

    console.log("[proxy] n8n payload:", JSON.stringify(n8nPayload));

    // 2. n8n Webhook'una isteği gönder ve tamamlanmasını bekle
    // NOT: Önceden fire-and-forget yapılıyordu ama Next.js serverless ortamında
    // response dönüldükten sonra runtime fonksiyonu sonlandırdığı için
    // fetch isteği n8n'e ulaşamıyordu. Şimdi await ile bekliyoruz.
    try {
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(n8nPayload)
      });
      console.log("[proxy] n8n webhook yanıtı:", n8nResponse.status, n8nResponse.statusText);
    } catch (n8nErr) {
      // n8n'e ulaşılamasa bile job oluşturuldu, frontend polling yapabilir
      console.error("[proxy] n8n webhook hatası:", n8nErr);
    }

    // 3. Frontend'e hemen Job ID dönüyoruz (Polling statüsü takip edilmesi için)
    return NextResponse.json({
      success: true,
      job_id: job.id,
      message: "İşlem kuyruğa alındı. Lütfen bekleyin..."
    });

  } catch (err: any) {
    console.error("[gorsel-yerlestir proxy] Hata:", err);
    return NextResponse.json(
      { error: err.message || "Sunucu hatası" },
      { status: 500 }
    );
  }
}
