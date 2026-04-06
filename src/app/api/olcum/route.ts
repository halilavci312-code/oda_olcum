import { NextRequest, NextResponse } from "next/server";

const PYTHON_API_URL =
  process.env.PYTHON_API_URL || "http://187.124.14.208:8001/olc";

export async function POST(req: NextRequest) {
  console.log("[/api/olcum] Request received, Python API URL:", PYTHON_API_URL);

  try {
    const formData = await req.formData();

    // AbortController ile 60 saniyelik timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let response: Response;
    try {
      response = await fetch(PYTHON_API_URL, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
        console.error("[/api/olcum] Timeout after 60s");
        return NextResponse.json(
          { hata: "Python API sunucusu 60 saniye içinde yanıt vermedi. Lütfen tekrar deneyin." },
          { status: 504 }
        );
      }
      const msg = fetchErr instanceof Error ? fetchErr.message : "Bilinmeyen bağlantı hatası";
      console.error("[/api/olcum] Fetch error:", msg);
      return NextResponse.json(
        { hata: `Python API sunucusuna bağlanılamadı: ${msg}` },
        { status: 502 }
      );
    }

    // Yanıt JSON mi kontrol et
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      console.error("[/api/olcum] Non-JSON response:", text.substring(0, 200));
      return NextResponse.json(
        { hata: `API beklenmedik yanıt döndürdü (${response.status}): ${text.substring(0, 100)}` },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("[/api/olcum] API error response:", data);
      return NextResponse.json(data, { status: response.status });
    }

    console.log("[/api/olcum] Success:", JSON.stringify(data).substring(0, 100));
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "API sunucusuna ulaşılamadı";
    console.error("[/api/olcum] Proxy error:", err);
    return NextResponse.json({ hata: message }, { status: 502 });
  }
}
