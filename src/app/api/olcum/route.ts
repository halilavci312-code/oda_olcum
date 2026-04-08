import { NextRequest, NextResponse } from "next/server";

const PYTHON_API_URL =
  process.env.PYTHON_API_URL || "http://204.168.227.113:9000/api/olcum";

export async function POST(req: NextRequest) {
  console.log("[/api/olcum] ====== REQUEST RECEIVED ======");
  console.log("[/api/olcum] Python API URL:", PYTHON_API_URL);

  try {
    const incoming = await req.formData();
    
    // Log all incoming form fields
    const fieldNames: string[] = [];
    incoming.forEach((value, key) => {
      fieldNames.push(key);
    });
    console.log("[/api/olcum] Incoming form fields:", fieldNames.join(", "));

    // Python API'si "file" field adını bekliyor.
    // Frontend "fotograf" olarak gönderiyor — burada dönüştürüyoruz.
    const proxyFormData = new FormData();

    const foto = incoming.get("fotograf") ?? incoming.get("file");
    const koseler = incoming.get("duvar_koseler");

    if (!foto) {
      console.error("[/api/olcum] No photo found in form data!");
      return NextResponse.json(
        { hata: "Fotoğraf bulunamadı. Lütfen tekrar deneyin." },
        { status: 400 }
      );
    }

    // Log photo details
    if (foto instanceof Blob) {
      console.log("[/api/olcum] Photo type:", foto.type, "| size:", foto.size, "bytes");
    }

    proxyFormData.append("file", foto);

    if (koseler) {
      proxyFormData.append("duvar_koseler", koseler as string);
    }

    console.log("[/api/olcum] Forwarding to Python — foto:", typeof foto, "| koseler:", koseler);

    // AbortController ile 60 saniyelik timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let response: Response;
    try {
      response = await fetch(PYTHON_API_URL, {
        method: "POST",
        body: proxyFormData,
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
      console.error("[/api/olcum] Non-JSON response:", text.substring(0, 300));
      return NextResponse.json(
        { hata: `API beklenmedik yanıt döndürdü (${response.status}): ${text.substring(0, 150)}` },
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
