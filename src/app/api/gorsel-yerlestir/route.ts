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

    // Seçimlerden texture_prompt oluştur (n8n'in eski mantığıyla uyumlu çalışması için)
    let texture_prompt = null;
    const isOriginalColor = !color || color === "orijinal";
    const isOriginalFabric = !fabric || fabric === "orijinal";

    if (!isOriginalColor || !isOriginalFabric) {
      // API dosyasının başındaki textureMap'i kullanarak İngilizce prompt'u oluştur
      const colorText = !isOriginalColor && textureMap[color] ? textureMap[color] + " colored" : "";
      const fabricText = !isOriginalFabric && textureMap[fabric] ? textureMap[fabric] : "";
      
      texture_prompt = [colorText, fabricText].filter(Boolean).join(", ");
    }

    // 1. Supabase'e Job oluştur
    const { data: job, error: insertError } = await supabase
      .from("generation_jobs")
      .insert({
        status: "processing",
        room_image: oda_resim_url,
        product_image: urun_resim_url,
        color: color || null,
        fabric: fabric || null,
        texture_prompt: texture_prompt
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
      color: color || "orijinal",
      fabric: fabric || "orijinal",
      texture_prompt: texture_prompt
    };

    console.log("[proxy] n8n payload:", JSON.stringify(n8nPayload));

    // 2. n8n Webhook'una isteği gönder ve tamamlanmasını bekle
    // NOT: Kesin iletim sağlamak için headers'da Connection: keep-alive ve cache: no-store
    try {
      console.log("[proxy] n8n'e istek atılıyor...");
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Connection": "keep-alive"
        },
        body: JSON.stringify(n8nPayload),
        cache: "no-store", // Next.js'in isteği iptal etmesini veya cachelemesini önler
      });
      
      const responseText = await n8nResponse.text();
      console.log(`[proxy] n8n webhook yanıtı - Status: ${n8nResponse.status}, Body: ${responseText}`);
    } catch (n8nErr) {
      console.error("[proxy] n8n webhook BAĞLANTI HATASI:", n8nErr);
      // Hata alınsa bile job oluşturuldu. n8n'siz devam edebilir (veya error dönülebilir) ama polling'te kalacaktır.
    }

    // 3. Frontend'e hemen Job ID dönüyoruz
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
