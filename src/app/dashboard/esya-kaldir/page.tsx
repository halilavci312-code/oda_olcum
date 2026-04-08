"use client";

import { Upload, Camera, Sparkles, X, Loader2, ArrowRight, Plus, Minus } from "lucide-react";
import { useState, useRef, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type StoreState = {
  roomImage: File | null;
  productImage: File | null;
  roomPreview: string | null;
  productPreview: string | null;
  isLoading: boolean;
  resultImage: string | null;
};

let globalState: StoreState = {
  roomImage: null,
  productImage: null,
  roomPreview: null,
  productPreview: null,
  isLoading: false,
  resultImage: null,
};

let listeners: Array<() => void> = [];
const store = {
  getSnapshot: () => globalState,
  subscribe: (listener: () => void) => {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },
  setState: (newState: Partial<StoreState>) => {
    globalState = { ...globalState, ...newState };
    listeners.forEach(l => l());
  }
};

export default function GorselYerlestirmePage() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { roomImage, productImage, roomPreview, productPreview, isLoading, resultImage } = state;
  
  const setRoomImage = (file: File | null) => store.setState({ roomImage: file });
  const setProductImage = (file: File | null) => store.setState({ productImage: file });
  const setRoomPreview = (s: string | null) => store.setState({ roomPreview: s });
  const setProductPreview = (s: string | null) => store.setState({ productPreview: s });
  const setIsLoading = (loading: boolean) => store.setState({ isLoading: loading });
  const setResultImage = (s: string | null) => store.setState({ resultImage: s });

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'Yapay zeka görselleştirme nasıl çalışır?',
      answer: 'Yapay zekamız, oda görselini analiz ederek mobilya, kapılar ve mimari öğeler gibi görsel ipuçlarını kullanarak perspektifi tahmin eder. Ardından seçtiğiniz ürünü oda görselinize boyut ve ışığa uygun bir şekilde yerleştirir.'
    },
    {
      question: 'Kendi mobilya fotoğraflarımı yükleyebilir miyim?',
      answer: 'Evet! Herhangi bir mobilya ürün fotoğrafını yükleyebilirsiniz. Yapay zekamız otomatik olarak arka planı kaldırır ve ürünü oda görselinize uygun perspektif, ışık ve gölgelerle gerçekçi bir şekilde yerleştirir.'
    },
    {
      question: 'Sistem ürün dokusunu ve rengini koruyor mu?',
      answer: 'Kesinlikle. Yapay zekamız mobilyanızın tam dokusunu, rengini ve malzeme görünümünü korurken, ışıklandırma ve gölgeleri oda ortamına uyarlar.'
    },
    {
      question: 'Platformu kullanmak için teknik bilgiye ihtiyacım var mı?',
      answer: 'Hiç de değil! Platformumuz sezgisel arayüzü ile kullanıcı dostu olacak şekilde tasarlanmıştır. Sadece oda fotoğrafınızı ve ürününüzü yükleyin, gerisini yapay zekaya bırakın.'
    },
    {
      question: 'Hangi dosya formatları destekleniyor?',
      answer: 'JPG, PNG ve WEBP dahil tüm yaygın görsel formatlarını destekliyoruz. En iyi sonuçlar için yüksek çözünürlüklü görseller (ortamın iyi ışık aldığı net fotoğraflar) öneriyoruz.'
    }
  ];

  const roomInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) => {
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = (
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void,
    inputRef: React.RefObject<HTMLInputElement>
  ) => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleReset = () => {
    clearImage(setRoomImage, setRoomPreview, roomInputRef);
    clearImage(setProductImage, setProductPreview, productInputRef);
    setResultImage(null);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `giy_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    // "evimde_gor_medya" bucket'ına yüklüyoruz
    const { error: uploadError } = await supabase.storage
      .from("evimde_gor_medya")
      .upload(fileName, file, { cacheControl: "3600" });

    if (uploadError) throw new Error("Supabase yükleme hatası: " + uploadError.message);

    const { data } = supabase.storage
      .from("evimde_gor_medya")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!roomImage || !productImage) return;
    setIsLoading(true);
    setResultImage(null);
    
    try {
      // 1. Odayı ve Koltuğu Supabase'e Yükle
      const [odaResimUrl, urunResimUrl] = await Promise.all([
        uploadFile(roomImage),
        uploadFile(productImage)
      ]);

      // 2. n8n Webhook'una İstek Gönder
      const webhookUrl = "https://n8n.halilavc.com/webhook-test/odanda-gor";
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oda_resim_url: odaResimUrl,
          urun_resim_url: urunResimUrl
        })
      });

      if (!response.ok) {
         throw new Error(`n8n sunucusu geçersiz yanıt verdi: ${response.status}`);
      }

      const resultText = await response.text();
      let n8nData: any = {};
      
      try {
        n8nData = JSON.parse(resultText);
      } catch(e) {
        console.warn("n8n yanıtı JSON değil:", resultText);
      }

      // 3. n8n'den dönen sonuc_fotograf formatını al
      const finalImageUrl = n8nData?.sonuc_fotograf;
      
      if (finalImageUrl && typeof finalImageUrl === "string" && finalImageUrl.startsWith("http")) {
        setResultImage(finalImageUrl);
        toast.success("Fotoğraf başarıyla oluşturuldu!");
      } else {
        console.warn("n8n başarılı ancak beklenen 'sonuc_fotograf' anahtarı bulunamadı:", n8nData);
        toast.success("n8n süreci tetiklendi ancak sonuç formatı beklenenden farklı.");
        // Geri bildirim çalışmazsa fallback
        setResultImage(odaResimUrl);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = roomImage !== null && productImage !== null && !isLoading;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      <header className="text-center mb-10 w-full flex flex-col items-center">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm text-[13px] font-medium text-indigo-700 dark:text-indigo-400 mb-6 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Yapay Zeka Destekli Görselleştirme
        </motion.div>
        
        <motion.h1
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-5xl font-bold tracking-[-0.03em] mb-4 text-gray-900 dark:text-zinc-100"
        >
          Evinde Gör <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-teal-500">AI</span>
        </motion.h1>
        
        <motion.p
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, delay: 0.2 }}
          className="text-gray-500 dark:text-zinc-400 text-lg max-w-2xl mx-auto font-light leading-relaxed"
        >
          Odanızın fotoğrafını çekin, kataloğumuzdan beğendiğiniz ürünü seçin. Yapay zekamız o mobilyayı saniyeler içinde odanıza yerleştirsin.
        </motion.p>
      </header>

      <AnimatePresence mode="wait">
        {!resultImage ? (
          <motion.div
            key="upload-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="w-full"
          >
            {/* Steps Info */}
            <div className="grid md:grid-cols-3 gap-5 mb-10">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gray-200 dark:bg-zinc-800 rounded-2xl blur opacity-50 group-hover:opacity-80 transition-opacity"></div>
                <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 h-full flex flex-col transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-white shadow-sm" style={{ background: "linear-gradient(135deg, #111111, #333333)" }}>
                    <Camera size={18} />
                  </div>
                  <div className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Adım 1</div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 mb-2">Odanızı Fotoğraflayın</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed font-light">
                    Mobilya koymak istediğiniz odanın net bir fotoğrafını çekin ve yükleyin.
                  </p>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gray-200 dark:bg-zinc-800 rounded-2xl blur opacity-50 group-hover:opacity-80 transition-opacity"></div>
                <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 h-full flex flex-col transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-white shadow-sm" style={{ background: "linear-gradient(135deg, #111111, #333333)" }}>
                    <Upload size={18} />
                  </div>
                  <div className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Adım 2</div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 mb-2">Ürünü Seçin</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed font-light">
                    Yerleştirmek istediğiniz mobilyanın görselini sisteme yükleyin.
                  </p>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gray-200 dark:bg-zinc-800 rounded-2xl blur opacity-50 group-hover:opacity-80 transition-opacity"></div>
                <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 h-full flex flex-col transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-white shadow-sm" style={{ background: "linear-gradient(135deg, #4f46e5, #14b8a6)" }}>
                    <Sparkles size={18} />
                  </div>
                  <div className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Adım 3</div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 mb-2">Sonucu Görün</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed font-light">
                    Yapay zeka mobilyayı saniyeler içerisinde odanıza entegre eder.
                  </p>
                </div>
              </div>
            </div>

            {/* Upload Area */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-8 shadow-sm transition-colors">
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Room Image */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Oda Fotoğrafı</span>
                  </div>
                  
                  <input
                    ref={roomInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null, setRoomImage, setRoomPreview)}
                  />
                  {roomPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 h-56 md:h-64 group shadow-inner">
                      <img src={roomPreview} alt="Oda" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <button
                        onClick={() => clearImage(setRoomImage, setRoomPreview, roomInputRef)}
                        className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black rounded-full flex items-center justify-center transition-colors backdrop-blur-md shadow-lg"
                        type="button"
                      >
                        <X size={16} className="text-white" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent py-4 px-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                        <span className="text-white text-sm font-medium truncate block">{roomImage?.name}</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => roomInputRef.current?.click()}
                      className="w-full h-56 md:h-64 border border-gray-200 dark:border-zinc-700 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 bg-gray-50/50 dark:bg-zinc-950/50 group"
                      type="button"
                    >
                      <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera size={22} className="text-indigo-500 dark:text-indigo-400" />
                      </div>
                      <div className="text-center">
                        <span className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 tracking-tight mb-0.5">Oda fotoğrafı seç</span>
                        <span className="block text-xs text-gray-400 dark:text-zinc-500">Sürükle bırak veya tıkla (JPG, PNG)</span>
                      </div>
                    </button>
                  )}
                </div>

                {/* Product Image */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Ürün Görseli</span>
                  </div>
                  
                  <input
                    ref={productInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null, setProductImage, setProductPreview)}
                  />
                  {productPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 h-56 md:h-64 group shadow-inner">
                      <img src={productPreview} alt="Ürün" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <button
                        onClick={() => clearImage(setProductImage, setProductPreview, productInputRef)}
                        className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black rounded-full flex items-center justify-center transition-colors backdrop-blur-md shadow-lg"
                        type="button"
                      >
                        <X size={16} className="text-white" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent py-4 px-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                        <span className="text-white text-sm font-medium truncate block">{productImage?.name}</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => productInputRef.current?.click()}
                      className="w-full h-56 md:h-64 border border-gray-200 dark:border-zinc-700 rounded-2xl hover:border-teal-400 dark:hover:border-teal-500/50 hover:bg-teal-50/30 dark:hover:bg-teal-500/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 bg-gray-50/50 dark:bg-zinc-950/50 group"
                      type="button"
                    >
                      <div className="w-14 h-14 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload size={22} className="text-teal-500 dark:text-teal-400" />
                      </div>
                      <div className="text-center">
                        <span className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 tracking-tight mb-0.5">Ürün görseli seç</span>
                        <span className="block text-xs text-gray-400 dark:text-zinc-500">Sürükle bırak veya tıkla (JPG, PNG, WEBP)</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              <div className="max-w-md mx-auto">
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={`w-full py-4 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-3 transition-all ${
                    canSubmit
                      ? "bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-gray-200 hover:scale-[1.02] shadow-lg shadow-black/10 active:scale-[0.98]"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed border border-gray-200 dark:border-zinc-700"
                  }`}
                  type="button"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className={`animate-spin ${canSubmit ? "text-white/70 dark:text-black/70" : ""}`} />
                      Yapay Zeka Analiz Ediyor...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} className={canSubmit ? "text-indigo-400 dark:text-indigo-600" : ""} />
                      Görselleştirmeyi Başlat
                    </>
                  )}
                </button>
                
                {(!roomImage || !productImage) && (
                  <p className="text-center text-[13px] text-gray-400 dark:text-zinc-500 mt-4 font-light flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-zinc-700"></span>
                    Devam etmek için her iki fotoğrafı da yükleyin
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result-section"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-8 shadow-sm flex flex-col items-center transition-colors"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 mb-6 border border-emerald-100 dark:border-emerald-500/20">
               <Sparkles className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em] mb-2">Harika Görünüyor!</h2>
            <p className="text-gray-500 dark:text-zinc-400 mb-8 max-w-sm text-center text-sm">Yapay zeka eşyayı odanızın aydınlatma ve zemin yapısına uygun şekilde yerleştirdi.</p>
            
            <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 shadow-md bg-gray-50 dark:bg-zinc-950 mb-8">
               <img src={resultImage} alt="Oluşturulan Görsel" className="w-full h-auto object-cover" />
               <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white text-[12px] font-medium shadow-sm">
                 <Sparkles className="w-3.5 h-3.5 text-indigo-300" /> AI Generated
               </div>
            </div>

            <button
              onClick={handleReset}
              className="px-6 py-2.5 rounded-full border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100 transition-all text-[14px] font-semibold flex items-center justify-center gap-2"
            >
              Yeni Görsel Oluştur <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SSS (FAQ) SECTION */}
      <section className="mt-16 mb-12 w-full max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-3 tracking-[-0.02em]">
            Sıkça Sorulan Sorular
          </h2>
          <p className="text-gray-500 dark:text-zinc-400 text-[15px] font-light">
            Yapay zeka destekli mobilya görselleştirme platformumuz hakkında bilmeniz gereken her şey
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`bg-white dark:bg-zinc-900 rounded-2xl border transition-all duration-300 overflow-hidden ${
                openFaqIndex === index 
                  ? "border-indigo-200 dark:border-indigo-500/50 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.1)] dark:shadow-[0_4px_20px_-4px_rgba(99,102,241,0.2)]" 
                  : "border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 shadow-sm"
              }`}
            >
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
              >
                <span className={`text-[15px] font-semibold pr-4 transition-colors ${openFaqIndex === index ? "text-indigo-900 dark:text-indigo-300" : "text-gray-900 dark:text-zinc-200"}`}>
                  {faq.question}
                </span>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  openFaqIndex === index ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-gray-50 dark:bg-zinc-950 text-gray-400 dark:text-zinc-500 border border-gray-100 dark:border-zinc-800"
                }`}>
                  {openFaqIndex === index ? (
                    <Minus size={18} />
                  ) : (
                    <Plus size={18} />
                  )}
                </div>
              </button>

              {openFaqIndex === index && (
                <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                  <p className="text-gray-600 dark:text-zinc-400 text-[14px] leading-relaxed font-light">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ ÖN İZLEME (PREVIEW) SECTION ═══════ */}
      <section className="mt-4 mb-16 w-full max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 tracking-wide uppercase">Nasıl Çalışır?</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-2 tracking-[-0.02em]">
            Ön İzleme
          </h3>
          <p className="text-gray-500 dark:text-zinc-400 text-[14px] font-light max-w-lg mx-auto">
            Oda fotoğrafınızı ve ürün fotoğrafınızı yükleyin, yapay zeka sizin için birleştirsin
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0">
          {/* Box 1: Oda Fotoğrafı */}
          <div className="group relative w-full md:w-[280px] flex-shrink-0">
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-blue-500/30 via-indigo-500/20 to-purple-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[1px]" />
            <div className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 transition-all duration-300 group-hover:border-indigo-300 dark:group-hover:border-indigo-500/40 group-hover:shadow-[0_8px_30px_-6px_rgba(99,102,241,0.12)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
                  <Camera className="w-4.5 h-4.5 text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-zinc-100">Oda Fotoğrafı</p>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-light">Odanızın görselini yükleyin</p>
                </div>
              </div>
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-850 border border-gray-100 dark:border-zinc-700/50">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mx-auto mb-2 border border-blue-100 dark:border-blue-500/20">
                      <Camera className="w-5 h-5 text-blue-400 dark:text-blue-300" />
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-medium">Oda Görseli</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Arrow 1 */}
          <div className="flex items-center justify-center w-12 md:w-16 flex-shrink-0 py-2 md:py-0">
            <div className="hidden md:flex items-center">
              <div className="w-8 h-[2px] bg-gradient-to-r from-blue-300 to-indigo-400 dark:from-blue-500/50 dark:to-indigo-500/50 rounded-full" />
              <svg className="w-4 h-4 text-indigo-400 dark:text-indigo-400 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex md:hidden flex-col items-center">
              <div className="h-6 w-[2px] bg-gradient-to-b from-blue-300 to-indigo-400 dark:from-blue-500/50 dark:to-indigo-500/50 rounded-full" />
              <svg className="w-4 h-4 text-indigo-400 dark:text-indigo-400 -mt-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Box 2: Ürün Fotoğrafı */}
          <div className="group relative w-full md:w-[280px] flex-shrink-0">
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-purple-500/30 via-indigo-500/20 to-pink-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[1px]" />
            <div className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 transition-all duration-300 group-hover:border-purple-300 dark:group-hover:border-purple-500/40 group-hover:shadow-[0_8px_30px_-6px_rgba(147,51,234,0.12)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center border border-purple-100 dark:border-purple-500/20">
                  <Upload className="w-4.5 h-4.5 text-purple-500 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-zinc-100">Ürün Fotoğrafı</p>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-light">Mobilya görselini yükleyin</p>
                </div>
              </div>
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-850 border border-gray-100 dark:border-zinc-700/50">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center mx-auto mb-2 border border-purple-100 dark:border-purple-500/20">
                      <Upload className="w-5 h-5 text-purple-400 dark:text-purple-300" />
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-medium">Ürün Görseli</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Arrow 2 */}
          <div className="flex items-center justify-center w-12 md:w-16 flex-shrink-0 py-2 md:py-0">
            <div className="hidden md:flex items-center">
              <div className="w-8 h-[2px] bg-gradient-to-r from-purple-300 to-emerald-400 dark:from-purple-500/50 dark:to-emerald-500/50 rounded-full" />
              <svg className="w-4 h-4 text-emerald-400 dark:text-emerald-400 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex md:hidden flex-col items-center">
              <div className="h-6 w-[2px] bg-gradient-to-b from-purple-300 to-emerald-400 dark:from-purple-500/50 dark:to-emerald-500/50 rounded-full" />
              <svg className="w-4 h-4 text-emerald-400 dark:text-emerald-400 -mt-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Box 3: Çıktı */}
          <div className="group relative w-full md:w-[280px] flex-shrink-0">
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-emerald-500/30 via-teal-500/20 to-cyan-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[1px]" />
            <div className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 transition-all duration-300 group-hover:border-emerald-300 dark:group-hover:border-emerald-500/40 group-hover:shadow-[0_8px_30px_-6px_rgba(16,185,129,0.12)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                  <Sparkles className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-zinc-100">Çıktı</p>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-light">AI tarafından oluşturulan sonuç</p>
                </div>
              </div>
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-850 border border-gray-100 dark:border-zinc-700/50">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-2 border border-emerald-100 dark:border-emerald-500/20">
                      <Sparkles className="w-5 h-5 text-emerald-400 dark:text-emerald-300" />
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-medium">AI Sonuç</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
