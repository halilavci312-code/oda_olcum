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
  Info,
  Clock,
  ChevronRight,
  Maximize2,
  Image as ImageIcon,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const API_URL = "/api/olcum";
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

interface DBMeasurement {
  id: string;
  customer_name: string;
  photo_url: string;
  wall_width_cm: number;
  wall_height_cm: number;
  reference_type: string;
  created_at: string;
}

export default function OlcumPage() {
  const [step, setStep] = useState<Step>("upload");
  const [points, setPoints] = useState<Point[]>([]);
  const [magnifierEnabled, setMagnifierEnabled] = useState(false);
  const [result, setResult] = useState<MeasurementResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [history, setHistory] = useState<DBMeasurement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  
  const [customerName, setCustomerName] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

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

  const loadHistory = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;
      
      const { data, error } = await supabase
        .from("measurements")
        .select("id, customer_name, photo_url, wall_width_cm, wall_height_cm, reference_type, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
        
      if (!error && data) {
        setHistory(data as any);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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
    if (!customerName.trim()) {
      alert("Lütfen önce müşteri adı ve soyadı girin.");
      return;
    }
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
  }, [customerName]);

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

    // Extract the visual canvas measurement to a blob before unmounting the canvas
    let canvasBlob: Blob | null = null;
    if (canvasRef.current) {
      try {
        canvasBlob = await new Promise<Blob | null>((resolve) =>
          canvasRef.current!.toBlob(resolve, "image/jpeg", 0.9)
        );
      } catch (e) {
        console.error("Canvas to blob conversion failed:", e);
      }
    }

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

      // Hem HTTP hata kodlarını hem de mantıksal hataları yakala
      if (!res.ok || data.durum === "hata") {
        const errorMsg = data.hata || data.mesaj || "Bilinmeyen hata";
        const solutionMsg = data.cozum ? `\n${data.cozum}` : "";
        throw new Error(`${errorMsg}${solutionMsg}`);
      }

      // Sonuç değerlerinin gerçekten dolu olduğunu kontrol et
      if (!data.duvar_genislik_cm && !data.duvar_yukseklik_cm) {
        throw new Error("Ölçüm değerleri alınamadı. Lütfen fotoğrafta referans nesne olduğundan emin olun.");
      }

      setResult(data);
      setStep("result");
      
      // Save Calculated Photo to Supabase Storage
      let finalPhotoUrl = "";
      if (canvasBlob) {
        // Generate a random unique filename
        const fileName = `olcum_${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("customer_photos")
          .upload(fileName, canvasBlob, {
             contentType: "image/jpeg",
             cacheControl: "3600",
             upsert: false
          });
          
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("customer_photos")
            .getPublicUrl(fileName);
          finalPhotoUrl = urlData.publicUrl;
        } else {
          console.error("Supabase Storage Upload Error:", uploadError);
        }
      }

      // Save to Supabase DB
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (user) {
        const { error } = await supabase.from("measurements").insert({
          user_id: user.id,
          customer_name: customerName,
          photo_url: finalPhotoUrl,
          wall_width_cm: data.duvar_genislik_cm,
          wall_height_cm: data.duvar_yukseklik_cm,
          wall_width_m: data.duvar_genislik_m,
          wall_height_m: data.duvar_yukseklik_m,
          confidence_score: data.guven_skoru,
          reference_type: data.referans,
          algorithm_details: data.aciklama,
        });
        if (!error) {
          toast.success("Ölçüm başarıyla kaydedildi");
          loadHistory(); // refresh history
        } else {
          toast.error("Ölçüm veritabanına kaydedilemedi");
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Bilinmeyen hata";
      setApiError(message);
      toast.error(message);
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
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm text-[13px] font-medium text-gray-600 dark:text-zinc-400 mb-6 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            Ölçüm Paneli
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-[-0.03em] mb-4 text-gray-900 dark:text-zinc-100"
          >
            Pratik <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-teal-500">Alan</span> Ölçümü
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-gray-500 dark:text-zinc-400 text-lg max-w-2xl mx-auto font-light"
          >
            Fotoğrafınızı yükleyin, duvarın 4 köşesini seçin. Yapay zeka ortalama %90 doğruluk payıyla (±10-15 cm sapma payı olabilir) saniyeler içinde alanınızı hesaplasın.
          </motion.p>
        </header>

        <AnimatePresence mode="wait">
          {/* ── STEP 1: UPLOAD ───────────────────────────────────── */}
          {step === "upload" && (
            <motion.div
              key="upload-container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="w-full flex flex-col gap-8"
            >
              
              <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm transition-colors">
                <label className="block text-[14px] font-semibold text-gray-700 dark:text-zinc-300 mb-2">Müşteri Adı - Soyadı</label>
                <input
                  type="text"
                  placeholder="Örn: Ahmet Yılmaz"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/20 outline-none transition-all text-gray-700 dark:text-zinc-100 bg-gray-50/50 dark:bg-zinc-950/50"
                  required
                />
              </div>

              {/* UPLOAD CARD */}
              <section
                className="relative overflow-hidden rounded-2xl p-8 text-center group cursor-pointer border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800/80 hover:border-gray-300 dark:hover:border-zinc-700 transition-all duration-500 shadow-sm"
                onClick={() => {
                  if(!customerName.trim()) {
                    toast.error("Lütfen fotoğraf yüklemeden önce Müşteri Adını girin!");
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-100/0 via-indigo-600/[0.03] dark:via-indigo-500/[0.05] to-indigo-100/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
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
                  <div className="w-16 h-16 mb-6 rounded-2xl flex items-center justify-center border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 group-hover:bg-white dark:group-hover:bg-zinc-900 group-hover:scale-110 group-hover:border-indigo-500/30 transition-all duration-300 shadow-sm">
                    <Upload className="w-7 h-7 text-gray-400 dark:text-zinc-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-zinc-100 tracking-[-0.01em]">Fotoğraf Yükle</h3>
                  <p className="text-gray-500 dark:text-zinc-400 text-[14px] font-light mb-8">Sürükleyip bırakın veya seçmek için tıklayın (JPG, PNG)</p>
                  <span
                  className="bg-black dark:bg-white text-white dark:text-black font-semibold py-3 px-8 rounded-full text-[14px] inline-block shadow-md transition-all duration-300 hover:bg-neutral-800 dark:hover:bg-gray-200 hover:scale-[1.03] active:scale-[0.97]"
                >
                  Görsel Seç
                </span>
              </div>
              </section>

              {/* RULES SECTION */}
              <section className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-sm transition-colors">
                <div className="flex items-center gap-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                    <Info className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-zinc-100 tracking-tight">Doğru Ölçüm İçin Fotoğraf Kuralları</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[14px]">
                  <div className="bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:shadow-sm transition-all flex flex-col gap-3">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 flex items-center justify-center font-bold text-gray-700 dark:text-zinc-300 shadow-sm">1</div>
                    <p className="text-gray-600 dark:text-zinc-400 font-light leading-relaxed">
                      Yere veya duvara bir <b className="text-gray-900 dark:text-zinc-100 font-semibold">A4 Kağıdı (21x29.7 cm)</b> tamamen düz bir şekilde (kıvrımsız) yerleştirilmiş olmalıdır.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:shadow-sm transition-all flex flex-col gap-3">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 flex items-center justify-center font-bold text-gray-700 dark:text-zinc-300 shadow-sm">2</div>
                    <p className="text-gray-600 dark:text-zinc-400 font-light leading-relaxed">
                      Kamera, A4 kağıdına ve duvara <b className="text-gray-900 dark:text-zinc-100 font-semibold">tam karşıdan veya çok hafif açıyla</b> bakmalıdır. <br/> (Dar açılı çekimler yanılsamaya sebep olur)
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:shadow-sm transition-all flex flex-col gap-3">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 flex items-center justify-center font-bold text-gray-700 dark:text-zinc-300 shadow-sm">3</div>
                    <p className="text-gray-600 dark:text-zinc-400 font-light leading-relaxed">
                      Ölçmek istediğiniz alanın 4 köşesi ve A4 kağıdı, kare <b className="text-gray-900 dark:text-zinc-100 font-semibold">içerisinde tamamen net</b> bir şekilde görünmelidir.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:shadow-sm transition-all flex flex-col gap-3">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 flex items-center justify-center font-bold text-gray-700 dark:text-zinc-300 shadow-sm">4</div>
                    <p className="text-gray-600 dark:text-zinc-400 font-light leading-relaxed">
                      Ortam ışığının iyi olmasına ve bulanıklık olmamasına dikkat edin. Net bir fotoğraf en doğru sonucu verir.
                    </p>
                  </div>
                </div>
              </section>

              {/* HISTORY SECTION */}
              <section className="mb-12">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.01em]">Geçmiş Ölçümlerim</h2>
                </div>
                
                {historyLoading ? (
                  <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm p-12 flex justify-center transition-colors">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
                    <div className="p-12 text-center flex flex-col items-center justify-center">
                      <div className="w-14 h-14 bg-gray-50 dark:bg-zinc-950 rounded-full flex items-center justify-center mb-4 border border-gray-100 dark:border-zinc-800">
                         <Clock className="w-6 h-6 text-gray-400 dark:text-zinc-600" />
                      </div>
                      <h3 className="text-gray-900 dark:text-zinc-200 font-semibold mb-1 tracking-[-0.01em]">Henüz ölçüm geçmişiniz yok</h3>
                      <p className="text-gray-500 dark:text-zinc-500 text-[14px]">Sisteme yüklediğiniz ve tamamlanan başarılı ölçümleriniz burada listelenir.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {history.map((item) => (
                      <div key={item.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 hover:border-gray-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="text-[14px] font-semibold text-gray-900 dark:text-zinc-100 line-clamp-1">
                            {item.customer_name || "İsimsiz Müşteri"}
                          </div>
                          <span className="text-[12px] text-gray-400 dark:text-zinc-500 whitespace-nowrap">
                            {format(new Date(item.created_at), "d MMM yyyy", { locale: tr })}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-[80px_1fr] gap-4 w-full mt-2">
                          {/* Photo Thumbnail */}
                          {item.photo_url ? (
                            <button 
                              onClick={() => setSelectedPhoto(item.photo_url)}
                              className="w-full h-20 rounded-md border border-gray-200 dark:border-zinc-800 overflow-hidden relative group shadow-sm bg-gray-50 dark:bg-zinc-950"
                            >
                              <img src={item.photo_url} alt="Room" className="w-full h-full object-cover group-hover:scale-110 transition-transform" crossOrigin="anonymous"/>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                 <Maximize2 className="w-4 h-4" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-full h-20 rounded-md border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-gray-300 dark:text-zinc-700" />
                            </div>
                          )}

                          {/* Dimensions */}
                          <div className="flex flex-col justify-center">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest">En</span>
                              <span className="text-[15px] font-semibold text-gray-900 dark:text-zinc-100">{Number(item.wall_width_cm).toFixed(1)}cm</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Boy</span>
                              <span className="text-[15px] font-semibold text-gray-900 dark:text-zinc-100">{Number(item.wall_height_cm).toFixed(1)}cm</span>
                            </div>
                          </div>
                        </div>
                        
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </motion.div>
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
              className="rounded-2xl p-6 md:p-8 mb-8 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-colors"
            >
              {apiError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[13px] text-center">
                  API Hatası: {apiError}
                </div>
              )}

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-3 tracking-[-0.01em]">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold text-white shadow-sm" style={{ background: "linear-gradient(135deg, #111111, #333333)" }}>2</span>
                    Köşeleri Seçin
                  </h2>
                  <p className="text-gray-500 dark:text-zinc-400 mt-1 text-[14px] font-light">
                    Ölçülecek alanın 4 köşesine sırasıyla tıklayın.{" "}
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{points.length}</span>/4 Seçildi
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-500/30 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 transition-all text-[13px] font-medium flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Farklı Görsel Seç
                  </button>
                  <button
                    onClick={() => setMagnifierEnabled((v) => !v)}
                    className={`px-4 py-2 rounded-xl border text-[13px] font-medium flex items-center gap-2 transition-all ${
                      magnifierEnabled
                        ? "border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100"
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
                    className="px-4 py-2 rounded-full border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100 transition-all text-[13px] font-medium flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Temizle
                  </button>
                  <button
                    disabled={points.length !== 4}
                    onClick={handleCalculate}
                    className={`px-5 py-2 rounded-full font-semibold text-[13px] flex items-center gap-2 transition-all ${
                      points.length === 4
                        ? "bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-gray-200 hover:scale-[1.03] active:scale-[0.97] shadow-sm"
                        : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed border border-gray-200 dark:border-zinc-700"
                    }`}
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
              className="rounded-2xl p-16 text-center border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-colors"
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
                <Loader2 className="absolute inset-0 w-6 h-6 m-auto text-gray-400 dark:text-zinc-500 animate-pulse" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-zinc-100 mb-2 tracking-[-0.01em]">Yapay Zeka Analiz Ediyor...</h3>
              <p className="text-gray-500 dark:text-zinc-400 text-[14px] font-light">
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
              <div className="rounded-2xl overflow-hidden relative border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-colors">
                {/* Subtle glow based on confidence */}
                <div
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full blur-3xl opacity-10 ${
                    confColors[result.guven_skoru]?.glow
                  }`}
                />
                <div className="p-8 relative">
                  <div className="flex items-center justify-center gap-3 mb-10">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">Ölçüm Tamamlandı</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 rounded-2xl p-6 relative overflow-hidden group hover:border-gray-300 dark:hover:border-zinc-700 transition-all">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.04] dark:bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/[0.08] dark:group-hover:bg-indigo-500/20 transition-all" />
                      <p className="text-gray-500 dark:text-zinc-400 text-[12px] font-medium uppercase tracking-widest mb-1">Genişlik</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">{result.duvar_genislik_cm}</span>
                        <span className="text-lg text-gray-400 dark:text-zinc-500 font-light">cm</span>
                      </div>
                      <p className="text-indigo-600 dark:text-indigo-400 font-medium mt-2 text-[13px]">{result.duvar_genislik_m} m</p>
                    </div>
                    <div className="border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 rounded-2xl p-6 relative overflow-hidden group hover:border-gray-300 dark:hover:border-zinc-700 transition-all">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/[0.04] dark:bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/[0.08] dark:group-hover:bg-teal-500/20 transition-all" />
                      <p className="text-gray-500 dark:text-zinc-400 text-[12px] font-medium uppercase tracking-widest mb-1">Yükseklik</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">{result.duvar_yukseklik_cm}</span>
                        <span className="text-lg text-gray-400 dark:text-zinc-500 font-light">cm</span>
                      </div>
                      <p className="text-teal-600 dark:text-teal-400 font-medium mt-2 text-[13px]">{result.duvar_yukseklik_m} m</p>
                    </div>
                  </div>

                  <div className="rounded-xl p-5 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Referans Tipi</span>
                      <span className="text-gray-900 dark:text-zinc-100 text-[14px] font-medium">{result.referans}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Algoritma Açıklaması</span>
                      <span className="text-gray-600 dark:text-zinc-300 text-[13px] font-light">{result.aciklama}</span>
                    </div>
                    <div className="flex flex-col md:items-end">
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Güven Skoru</span>
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border border-white/50 dark:border-black/50 ${
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
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors text-[13px] font-medium flex items-center justify-center gap-2 mx-auto"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Yeni Fotoğraf Yükle
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Photo View Modal */}
        {selectedPhoto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedPhoto(null)}>
            <div className="relative max-w-5xl w-full bg-white rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={() => setSelectedPhoto(null)}
                  className="w-10 h-10 bg-black/50 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors backdrop-blur shadow-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <img src={selectedPhoto} alt="Önizleme" className="w-full h-auto max-h-[85vh] object-contain bg-slate-100 shadow-inner" crossOrigin="anonymous"/>
            </div>
          </div>
        )}
    </div>
  );
}
