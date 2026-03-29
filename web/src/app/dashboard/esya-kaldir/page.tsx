"use client";

import { Wand2 } from "lucide-react";
import { motion } from "framer-motion";

export default function EsyaKaldirPage() {
  return (
    <div className="flex flex-col w-full h-[75vh] items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-xl w-full relative"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative border border-gray-200 bg-white shadow-xl shadow-gray-200/50 rounded-3xl p-10 md:p-14 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/[0.04] rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-sm" style={{ background: "linear-gradient(135deg, #111111, #333333)" }}>
            <Wand2 className="w-10 h-10 text-white animate-pulse" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-[-0.03em] mb-4">
            Sihirli Silgi <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-teal-500">(AI)</span>
          </h1>
          
          <p className="text-gray-500 leading-relaxed max-w-sm mx-auto mb-10 text-[15px] font-light">
            Odanızın fotoğrafını yükleyin, istemediğiniz eşyaları seçin ve yapay zeka saniyeler içinde odayı baştan yaratsın.
          </p>

          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-50 text-gray-700 rounded-full text-[13px] font-semibold tracking-wide border border-gray-200/80 shadow-sm animate-bounce">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            ÇOK YAKINDA
          </div>
        </div>
      </motion.div>
    </div>
  );
}
