import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fal } from "@fal-ai/client";

export const maxDuration = 60;

const colorTargets: Record<string, { r: number; g: number; b: number }> = {
  orijinal: { r: -1, g: -1, b: -1 },
  bej: { r: 215 / 255, g: 195 / 255, b: 170 / 255 },
  antrasit: { r: 40 / 255, g: 40 / 255, b: 42 / 255 },
  kiremit: { r: 160 / 255, g: 70 / 255, b: 35 / 255 },
  zumrut: { r: 15 / 255, g: 65 / 255, b: 40 / 255 },
};

function getLum(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function recolorChannel(origLum: number, pivot: number, target: number) {
  if (origLum <= pivot) return target * (origLum / pivot);
  const scale = (origLum - pivot) / (1 - pivot);
  return target + (1 - target) * scale;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q-p)*6*t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q-p)*(2/3-t)*6;
    return p;
  };
  const q = l < 0.5 ? l*(1+s) : l+s-l*s;
  const p = 2*l - q;
  return [hue2rgb(p,q,h+1/3), hue2rgb(p,q,h), hue2rgb(p,q,h-1/3)];
}

const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));

export async function POST(req: NextRequest) {
  try {
    const { job_id, color, fabric } = await req.json();
    if (!job_id) return NextResponse.json({ error: "Job ID eksik" }, { status: 400 });

    const { data: job, error: jobError } = await supabase
      .from("generation_jobs").select("result_url, mask_url").eq("id", job_id).single();

    if (jobError || !job) return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    if (!job.result_url || !job.mask_url)
      return NextResponse.json({ error: "Maske veya sonuç görseli henüz hazır değil." }, { status: 400 });

    if (color === "orijinal" && fabric === "orijinal")
      return NextResponse.json({ success: true, result_url: job.result_url });

    const hasFabricChange = fabric && fabric !== "orijinal";
    const hasColorChange = color && color !== "orijinal";

    const Jimp = (await import("jimp")).default;
    const [origImg, cutoutImg] = await Promise.all([
      Jimp.read(job.result_url),
      Jimp.read(job.mask_url),
    ]);
    const w = origImg.getWidth(), h = origImg.getHeight();
    if (cutoutImg.getWidth() !== w || cutoutImg.getHeight() !== h) cutoutImg.resize(w, h);

    // Pivot hesapla (renk değişimi için)
    let pivot = 0.7;
    if (hasColorChange) {
      let totalLum = 0, cnt = 0;
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const cp = Jimp.intToRGBA(cutoutImg.getPixelColor(x, y));
          if (cp.a > 128) {
            const op = Jimp.intToRGBA(origImg.getPixelColor(x, y));
            totalLum += getLum(op.r/255, op.g/255, op.b/255);
            cnt++;
          }
        }
      }
      if (cnt > 0) pivot = totalLum / cnt;
    }

    const targetColor = hasColorChange ? colorTargets[color] : null;

    // ═══════════════════════════════════════════════════════════════
    // KUMAŞ + RENK DEĞİŞİMİ: %100 PROGRAMATİK - YAPI KESİNLİKLE KORUNUR
    // Kumaş: HSL manipülasyonu ile doku simülasyonu (saturation, grain, kontrast)
    // Renk: Luminance mapping — BLUR YOK, BULANIKLIK YOK
    // ═══════════════════════════════════════════════════════════════

    if (hasFabricChange) {
      console.log("[renk-degistir] Programatik kumaş efekti (blur-free):", fabric);
    }

    // Per-pixel işlem: kumaş HSL efektleri + renk değişimi + mask compositing
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const maskPx = Jimp.intToRGBA(cutoutImg.getPixelColor(x, y));
        if (maskPx.a <= 5) continue;

        const alphaNorm = maskPx.a / 255;
        const origPx = Jimp.intToRGBA(origImg.getPixelColor(x, y));

        // Başlangıç: orijinal piksel (bulanıklık yok)
        let r = origPx.r / 255, g = origPx.g / 255, b = origPx.b / 255;

        if (hasFabricChange) {
          let [pH, pS, pL] = rgbToHsl(r, g, b);

          switch (fabric) {
            case "kadife":
              // Kadife: zengin doygun renkler, ışık emen yumuşak yüzey
              pS = Math.min(1, pS * 1.55);   // +55% doygunluk (belirgin zenginlik)
              pL = pL * 0.88;                 // Belirgin karartma (kadife ışık emer)
              // Kadife pile efekti: hafif parıltı varyasyonu
              const velvetSheen = Math.sin(x * 0.8 + y * 1.2) * 0.025;
              pL = Math.min(1, Math.max(0, pL + velvetSheen));
              break;
            case "keten":
              // Keten: doğal mat, belirgin dokuma paterni
              pS = pS * 0.68;               // -32% doygunluk (belirgin doğal/mat)
              pL = Math.min(1, pL * 1.07);   // Aydınlatma (keten açık renktir)
              // Güçlü dokuma grain paterni
              const grain = Math.sin(x * 5.7 + y * 0.3) * Math.cos(y * 4.3 + x * 0.2) * 0.06;
              const crossWeave = Math.sin(x * 12 + y * 12) * 0.02;
              pL = Math.min(1, Math.max(0, pL + grain + crossWeave));
              break;
            case "deri":
              // Deri: parlak, yüksek kontrastlı, pürüzsüz yüzey
              if (pL > 0.5) pL = Math.min(1, pL * 1.18);   // Parlak alanlar çok parlak
              else pL = pL * 0.85;                           // Koyu alanlar çok koyu
              pS = Math.min(1, pS * 1.25);                   // Belirgin doygunluk
              // Deri yüzey parlaklığı
              const specular = Math.pow(Math.max(0, Math.sin(x * 0.3) * Math.cos(y * 0.3)), 3) * 0.04;
              pL = Math.min(1, pL + specular);
              break;
            case "sonil":
              // Şönil: sıcak, yumuşak, peluş doku
              pS = Math.min(1, pS * 1.2);   // Belirgin doygunluk
              pH = (pH + 0.02) % 1;          // Belirgin sıcak ton kayması
              pL = Math.min(1, pL * 1.04);   // Hafif aydınlatma
              // Şönil iplik doku paterni
              const yarnTex = Math.sin(x * 8 + y * 3) * Math.sin(y * 7 - x * 2) * 0.03;
              pL = Math.min(1, Math.max(0, pL + yarnTex));
              break;
          }

          [r, g, b] = hslToRgb(pH, pS, pL);
        }

        // Renk değişimi varsa luminance mapping uygula
        if (targetColor) {
          const lum = getLum(r, g, b);
          r = Math.min(1, Math.max(0, recolorChannel(lum, pivot, targetColor.r)));
          g = Math.min(1, Math.max(0, recolorChannel(lum, pivot, targetColor.g)));
          b = Math.min(1, Math.max(0, recolorChannel(lum, pivot, targetColor.b)));
        }

        // Mask alpha ile yumuşak geçiş
        const oR = origPx.r / 255, oG = origPx.g / 255, oB = origPx.b / 255;
        const outR = oR * (1 - alphaNorm) + r * alphaNorm;
        const outG = oG * (1 - alphaNorm) + g * alphaNorm;
        const outB = oB * (1 - alphaNorm) + b * alphaNorm;

        origImg.setPixelColor(Jimp.rgbaToInt(
          clamp(outR * 255), clamp(outG * 255), clamp(outB * 255), origPx.a
        ), x, y);
      }
    }

    console.log("[renk-degistir] İşlem tamamlandı, yükleniyor...");

    const buffer = await origImg.getBufferAsync(Jimp.MIME_JPEG);
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const file = new File([new Blob([ab], { type: "image/jpeg" })], "result.jpg", { type: "image/jpeg" });
    const uploadedUrl = await fal.storage.upload(file);

    return NextResponse.json({ success: true, result_url: uploadedUrl });

  } catch (err: any) {
    console.error("[renk-degistir] Genel Hata:", err?.message || err);
    return NextResponse.json(
      { error: typeof err?.message === "string" ? err.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}
