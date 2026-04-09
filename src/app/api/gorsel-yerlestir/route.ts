import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120; // AI işlemi için 120 sn timeout

const N8N_WEBHOOK_URL = "https://n8n.halilavc.com/webhook/odanda-gor";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[proxy] n8n'e gönderilen body:", JSON.stringify(body));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 115_000); // 115sn

    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    console.log("[proxy] n8n status:", n8nResponse.status);

    const responseText = await n8nResponse.text();

    if (!n8nResponse.ok) {
      return NextResponse.json(
        { error: `n8n hata verdi: ${n8nResponse.status}`, detail: responseText },
        { status: n8nResponse.status }
      );
    }

    // JSON döndürüyorsa parse et, değilse text olarak gönder
    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data);
    } catch {
      return new NextResponse(responseText, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
  } catch (err: any) {
    console.error("[gorsel-yerlestir proxy] Hata:", err);
    return NextResponse.json(
      { error: err.message || "Sunucu hatası" },
      { status: 500 }
    );
  }
}
