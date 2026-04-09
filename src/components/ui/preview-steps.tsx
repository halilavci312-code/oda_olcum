"use client";

import { motion } from "framer-motion";
import { Camera, Sparkles, Upload, ArrowRight } from "lucide-react";

export function PreviewSteps() {
  return (
    <div className="w-full mt-24 mb-12 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2, duration: 0.8 }}
        className="flex flex-col items-center w-full max-w-5xl"
      >
        {/* Header */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 mb-6">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-[12px] font-semibold text-indigo-300 tracking-wider">NASIL ÇALIŞIR?</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ön İzleme</h2>
        <p className="text-gray-400 text-sm md:text-base mb-12 text-center max-w-xl">
          Oda fotoğrafınızı ve ürün fotoğrafınızı yükleyin, yapay zeka sizin için birleştirsin
        </p>

        {/* Steps Container */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 w-full">
          
          {/* Step 1 */}
          <div className="flex-1 bg-[#1A1A1A]/80 border border-white/5 rounded-2xl p-4 w-full md:max-w-[300px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Camera className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-semibold text-sm">Oda Fotoğrafı</h3>
                <p className="text-gray-500 text-[11px]">Odanızın görselini yükleyin</p>
              </div>
            </div>
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-gray-600 to-gray-300 relative group">
              <img src="/yeni_oda_fotografi.jpg" alt="Oda Görseli" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Arrow 1 */}
          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-indigo-500/50" />
          </div>

          {/* Step 2 */}
          <div className="flex-1 bg-[#1A1A1A]/80 border border-white/5 rounded-2xl p-4 w-full md:max-w-[300px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Upload className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-semibold text-sm">Ürün Fotoğrafı</h3>
                <p className="text-gray-500 text-[11px]">Mobilya görselini yükleyin</p>
              </div>
            </div>
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-gray-700 to-gray-400 relative">
              <img src="/urun_fotografi_2.jpg" alt="Ürün Görseli" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Arrow 2 */}
          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-emerald-500/50" />
          </div>

          {/* Step 3 */}
          <div className="flex-1 bg-[#1A1A1A]/80 border border-white/5 rounded-2xl p-4 w-full md:max-w-[300px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-semibold text-sm">Çıktı</h3>
                <p className="text-gray-500 text-[11px]">AI tarafından oluşturulan sonuç</p>
              </div>
            </div>
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-gray-500 to-gray-200 relative">
              <img src="/cikti_3.jpg" alt="Çıktı Görseli" className="w-full h-full object-cover" />
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
