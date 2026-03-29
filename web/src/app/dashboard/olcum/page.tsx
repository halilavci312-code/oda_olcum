"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import {
  Loader2,
  Upload,
  ZoomIn,
  RotateCcw,
  Zap,
  CheckCircle2,
  Home,
  LogOut,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = "http://187.124.14.208:8001/olc";
const ZOOM = 3;
const MAG_SIZE = 120;

type Point = { x: number; y: number };
type Step = "upload" | "canvas" | "loading" | "result";

interface MeasurementResult {
  duvar_genislik_cm: number;
  duvar_genislik_m: number;
  duvar_yukseklik_cm: number;
  duvar_yukseklik_m: number;
  referans: string;
  aciklama: string;
  guven_skoru: "yuksek" | "orta" | "dusuk";
}

export default function OlcumPage() {
  const [step, setStep] = useState<Step>("upload");
  const [points, setPoints] = useState<Point[]>([]);
  const [magnifierEnabled, setMagnifierEnabled] = useState(false);
  const [result, setResult] = useState<MeasurementResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const magnifierRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const originalFileRef = useRef<File | null>(null);
  const scaleRatioRef = useRef(1);
  const pointsRef = useRef<Point[]>([]);
  const needsSetup = useRef(false);

  // Sync pointsRef with state
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);


  // ── Canvas drawing ──────────────────────────────────────────────────────────
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);

    const pts = pointsRef.current;

    // Draw connecting lines / filled polygon
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      if (pts.length === 4) {
        ctx.lineTo(pts[0].x, pts[0].y);
        ctx.fillStyle = "rgba(20, 184, 166, 0.15)";
        ctx.fill();
      }
      ctx.strokeStyle = "#14b8a6";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw corner markers
    pts.forEach((pt, idx) => {
      const cx = pt.x;
      const cy = pt.y;

      // Outer glow ring
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(20, 184, 166, 0.25)";
      ctx.fill();

      // Middle ring
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, 2 * Math.PI);
      ctx.strokeStyle = "#14b8a6";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner filled circle
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, 2 * Math.PI);
      ctx.fillStyle = "#0d9488";
      ctx.fill();

      // Number label
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((idx + 1).toString(), cx, cy);
    });
  }, []);

  // ── Setup canvas dimensions ─────────────────────────────────────────────
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = imageRef.current;
    if (!canvas || !container || !img) return;

    // Setting canvas.width resets ALL transforms automatically
    const W = container.clientWidth || 800;
    const H = Math.round(img.height * (W / img.width));

    canvas.width  = W;
    canvas.height = H;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";

    // Enable high-quality image scaling without DPR complexity
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.imageSmoothingQuality = "high";

    scaleRatioRef.current = W / img.width;

    const mag = magnifierRef.current;
    if (mag) mag.style.backgroundImage = `url(${img.src})`;

    setPoints([]);
    pointsRef.current = [];
    redrawCanvas();
  }, [redrawCanvas]);

  // ── KEY FIX: run setupCanvas AFTER Framer Motion animation completes ─────────
  // This is called via onAnimationComplete on the canvas motion.section
  const handleCanvasReady = useCallback(() => {
    if (needsSetup.current) {
      needsSetup.current = false;
      setupCanvas();
    }
  }, [setupCanvas]);

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Lütfen sadece resim dosyası yükleyin.");
      return;
    }
    originalFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        needsSetup.current = true; // tell the useEffect to call setupCanvas
        setStep("canvas");         // triggers re-render → useEffect fires
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  // ── Canvas click — add point ────────────────────────────────────────────────
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (pointsRef.current.length >= 4) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      // Points stored in canvas pixel coords (1:1 with CSS since no DPR scaling)
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newPts = [...pointsRef.current, { x, y }];
      pointsRef.current = newPts;
      setPoints(newPts);
      redrawCanvas();
    },
    [redrawCanvas]
  );

  // ── Magnifier mousemove ─────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const mag = magnifierRef.current;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const img = imageRef.current;
      if (!mag || !canvas || !container || !img || !magnifierEnabled) {
        if (mag) mag.style.display = "none";
        return;
      }
      mag.style.display = "block";
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let left = x + 20;
      let top = y - MAG_SIZE - 10;
      if (top < 0) top = y + 20;
      if (left + MAG_SIZE > container.clientWidth) left = x - MAG_SIZE - 10;

      mag.style.left = left + "px";
      mag.style.top = top + "px";

      const imgX = x / scaleRatioRef.current;
      const imgY = y / scaleRatioRef.current;
      mag.style.backgroundSize = `${img.width * ZOOM}px ${img.height * ZOOM}px`;
      mag.style.backgroundPosition = `${-(imgX * ZOOM - MAG_SIZE / 2)}px ${-(imgY * ZOOM - MAG_SIZE / 2)}px`;
    },
    [magnifierEnabled]
  );

  // ── API call ────────────────────────────────────────────────────────────────
  const handleCalculate = async () => {
    if (pointsRef.current.length !== 4) return;
    setApiError(null);
    setStep("loading");

    const actualPoints = pointsRef.current.map((p) => [
      Math.round(p.x / scaleRatioRef.current),
      Math.round(p.y / scaleRatioRef.current),
    ]);

    const formData = new FormData();
    formData.append("fotograf", originalFileRef.current!);
    formData.append("duvar_koseler", JSON.stringify(actualPoints));

    try {
      const res = await fetch(API_URL, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.hata || data.cozum || "Bilinmeyen hata");
      setResult(data);
      setStep("result");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Bilinmeyen hata";
      setApiError(message);
      // Re-show canvas: re-trigger setup
      needsSetup.current = true;
      setStep("canvas");
    }
  };

  // ── Reset ───────────────────────────────────────────────────────────────────
  const handleReset = () => {
    originalFileRef.current = null;
    imageRef.current = null;
    pointsRef.current = [];
    needsSetup.current = false;
    setPoints([]);
    setResult(null);
    setApiError(null);
    setMagnifierEnabled(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setStep("upload");
  };

  const confColors = {
    yuksek: { badge: "bg-emerald-500/10 text-emerald-600", glow: "bg-emerald-500/20" },
    orta:   { badge: "bg-yellow-500/10 text-yellow-600",  glow: "bg-yellow-500/20"  },
    dusuk:  { badge: "bg-red-500/10 text-red-600",        glow: "bg-red-500/20"     },
  };

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <header className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 bg-white shadow-sm text-[13px] font-medium text-gray-600 mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            Ölçüm Paneli
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-[-0.03em] mb-4 text-gray-900"
          >
            Akıllı <span className="shimmer-text">Ölçüm</span> Sistemi
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-gray-500 text-lg max-w-2xl mx-auto font-light"
          >
            Fotoğrafınızı yükleyin, duvarın 4 köşesini seçin ve yapay zeka santimetre milimetresine kadar ölçsün.
          </motion.p>
        </header>

        <AnimatePresence mode="wait">
          {/* ── STEP 1: UPLOAD ───────────────────────────────────── */}
          {step === "upload" && (
            <motion.section
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="relative overflow-hidden rounded-2xl p-8 mb-8 text-center group cursor-pointer border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-500 shadow-sm"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100/0 via-indigo-600/[0.03] to-indigo-100/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
              />
              <div className="relative z-10 flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 mb-6 rounded-2xl flex items-center justify-center border border-gray-200 bg-gray-50 group-hover:bg-white group-hover:scale-110 group-hover:border-indigo-500/30 transition-all duration-300 shadow-sm">
                  <Upload className="w-7 h-7 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 tracking-[-0.01em]">Fotoğraf Yükle</h3>
                <p className="text-gray-500 text-[14px] font-light mb-8">Sürükleyip bırakın veya seçmek için tıklayın (JPG, PNG)</p>
                <span
                  className="text-white font-semibold py-3 px-8 rounded-full text-[14px] inline-block transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
                  style={{ background: "linear-gradient(135deg, #111111, #333333)" }}
                >
                  Görsel Seç
                </span>
              </div>
            </motion.section>
          )}

          {/* ── STEP 2: CANVAS ───────────────────────────────────── */}
          {step === "canvas" && (
            <motion.section
              key="canvas"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              onAnimationComplete={handleCanvasReady}
              className="rounded-2xl p-6 md:p-8 mb-8 border border-gray-200 bg-white shadow-sm"
            >
              {apiError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[13px] text-center">
                  API Hatası: {apiError}
                </div>
              )}

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3 tracking-[-0.01em]">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold text-white shadow-sm" style={{ background: "linear-gradient(135deg, #111111, #333333)" }}>2</span>
                    Köşeleri Seçin
                  </h2>
                  <p className="text-gray-500 mt-1 text-[14px] font-light">
                    Ölçülecek alanın 4 köşesine sırasıyla tıklayın.{" "}
                    <span className="text-indigo-600 font-semibold">{points.length}</span>/4 Seçildi
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all text-[13px] font-medium flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Farklı Görsel Seç
                  </button>
                  <button
                    onClick={() => setMagnifierEnabled((v) => !v)}
                    className={`px-4 py-2 rounded-xl border text-[13px] font-medium flex items-center gap-2 transition-all ${
                      magnifierEnabled
                        ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    {magnifierEnabled ? "Büyüteç Açık" : "Büyüteç"}
                  </button>
                  <button
                    onClick={() => {
                      setPoints([]);
                      pointsRef.current = [];
                      redrawCanvas();
                    }}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all text-[13px] font-medium flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Temizle
                  </button>
                  <button
                    disabled={points.length !== 4}
                    onClick={handleCalculate}
                    className={`px-5 py-2 rounded-xl font-semibold text-[13px] flex items-center gap-2 transition-all ${
                      points.length === 4
                        ? "text-white hover:scale-[1.03] active:scale-[0.97]"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                    }`}
                    style={points.length === 4 ? { background: "linear-gradient(135deg, #111111, #333333)" } : {}}
                  >
                    <Zap className="w-3.5 h-3.5" /> Hesapla
                  </button>
                </div>
              </div>

              <div className="w-full rounded-xl p-2 border border-gray-200 bg-gray-50">
                <div
                  ref={containerRef}
                  className="relative"
                  style={{
                    borderRadius: "0.75rem",
                    overflow: "hidden",
                    border: "1px solid rgba(0,0,0,0.1)",
                    minHeight: 200,
                    backgroundColor: "#fff"
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    style={{ display: "block", width: "100%", height: "auto", cursor: "crosshair" }}
                    onClick={handleCanvasClick}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => {
                      if (magnifierRef.current) magnifierRef.current.style.display = "none";
                    }}
                  />
                  {/* Magnifier lens */}
                  <div
                    ref={magnifierRef}
                    style={{
                      position: "absolute",
                      width: MAG_SIZE,
                      height: MAG_SIZE,
                      borderRadius: "50%",
                      border: "2px solid rgba(99,102,241,0.6)",
                      boxShadow: "0 0 20px rgba(99,102,241,0.3)",
                      pointerEvents: "none",
                      display: "none",
                      zIndex: 50,
                      backgroundRepeat: "no-repeat",
                      backgroundColor: "#fff",
                    }}
                  >
                    <span
                      style={{
                         position: "absolute",
                         top: "50%",
                         left: "50%",
                         transform: "translate(-50%,-50%)",
                         color: "rgba(99,102,241,0.5)",
                         fontSize: 20,
                         fontWeight: 300,
                         pointerEvents: "none",
                      }}
                    >
                      +
                    </span>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* ── STEP 3: LOADING ──────────────────────────────────── */}
          {step === "loading" && (
            <motion.section
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl p-16 text-center border border-gray-200 bg-white shadow-sm"
            >
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin" />
                <div
                  className="absolute inset-2 rounded-full border-r-2 border-teal-500 animate-spin"
                  style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
                />
                <div
                  className="absolute inset-4 rounded-full border-b-2 border-amber-500 animate-spin"
                  style={{ animationDuration: "2s" }}
                />
                <Loader2 className="absolute inset-0 w-6 h-6 m-auto text-gray-400 animate-pulse" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 tracking-[-0.01em]">Yapay Zeka Analiz Ediyor...</h3>
              <p className="text-gray-500 text-[14px] font-light">
                Referans nesneler tespit ediliyor ve pikseller gerçek dünya ölçülerine çevriliyor.
              </p>
            </motion.section>
          )}

          {/* ── STEP 4: RESULT ───────────────────────────────────── */}
          {step === "result" && result && (
            <motion.section
              key="result"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="rounded-2xl overflow-hidden relative border border-gray-200 bg-white shadow-sm">
                {/* Subtle glow based on confidence */}
                <div
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full blur-3xl opacity-10 ${
                    confColors[result.guven_skoru]?.glow
                  }`}
                />
                <div className="p-8 relative">
                  <div className="flex items-center justify-center gap-3 mb-10">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 tracking-[-0.02em]">Ölçüm Tamamlandı</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="border border-gray-200 bg-gray-50 rounded-2xl p-6 relative overflow-hidden group hover:border-gray-300 transition-all">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.04] rounded-full blur-2xl group-hover:bg-indigo-500/[0.08] transition-all" />
                      <p className="text-gray-500 text-[12px] font-medium uppercase tracking-widest mb-1">Genişlik</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-gray-900 tracking-tight">{result.duvar_genislik_cm}</span>
                        <span className="text-lg text-gray-400 font-light">cm</span>
                      </div>
                      <p className="text-indigo-600 font-medium mt-2 text-[13px]">{result.duvar_genislik_m} m</p>
                    </div>
                    <div className="border border-gray-200 bg-gray-50 rounded-2xl p-6 relative overflow-hidden group hover:border-gray-300 transition-all">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/[0.04] rounded-full blur-2xl group-hover:bg-teal-500/[0.08] transition-all" />
                      <p className="text-gray-500 text-[12px] font-medium uppercase tracking-widest mb-1">Yükseklik</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-gray-900 tracking-tight">{result.duvar_yukseklik_cm}</span>
                        <span className="text-lg text-gray-400 font-light">cm</span>
                      </div>
                      <p className="text-teal-600 font-medium mt-2 text-[13px]">{result.duvar_yukseklik_m} m</p>
                    </div>
                  </div>

                  <div className="rounded-xl p-5 border border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-gray-400 uppercase tracking-widest mb-1">Referans Tipi</span>
                      <span className="text-gray-900 text-[14px] font-medium">{result.referans}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-gray-400 uppercase tracking-widest mb-1">Algoritma Açıklaması</span>
                      <span className="text-gray-600 text-[13px] font-light">{result.aciklama}</span>
                    </div>
                    <div className="flex flex-col md:items-end">
                      <span className="text-[11px] text-gray-400 uppercase tracking-widest mb-1">Güven Skoru</span>
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border border-white/50 ${
                          confColors[result.guven_skoru]?.badge
                        }`}
                      >
                        {result.guven_skoru}
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={handleReset}
                      className="text-indigo-600 hover:text-indigo-700 transition-colors text-[13px] font-medium flex items-center justify-center gap-2 mx-auto"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Yeni Fotoğraf Yükle
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
    </div>
  );
}
