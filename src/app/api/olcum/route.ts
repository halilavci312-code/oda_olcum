import { NextRequest, NextResponse } from "next/server";

const PYTHON_API_URL =
  process.env.PYTHON_API_URL || "http://187.124.14.208:8001/olc";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const response = await fetch(PYTHON_API_URL, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "API sunucusuna ulaşılamadı";
    console.error("[/api/olcum] Proxy error:", err);
    return NextResponse.json({ hata: message }, { status: 502 });
  }
}
