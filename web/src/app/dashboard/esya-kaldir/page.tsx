"use client";

import { Wand2 } from "lucide-react";
import { motion } from "framer-motion";

export default function EsyaKaldirPage() {
  return (
    <div className="flex flex-col gap-8 w-full h-[80vh] items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-teal-100 shadow-sm">
          <Wand2 className="w-10 h-10 text-teal-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 tracking-[-0.02em] mb-4">
          Yapay Zeka ile Eşya Kaldırma
        </h1>
        <p className="text-gray-500 leading-relaxed mb-8 text-[15px]">
          Çok yakında! Odanızın fotoğrafını yükleyip, tıpkı büyülü bir silgi gibi mekandaki tüm eşyaları
          tek tıklamayla silebilecek ve yepyeni boş bir odaya dönüştürebileceksiniz.
        </p>

        <div className="inline-flex px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-[13px] font-semibold tracking-wider uppercase border border-gray-200">
          Geliştirme Aşamasında
        </div>
      </motion.div>
    </div>
  );
}
