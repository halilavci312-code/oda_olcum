"use client";

import { motion } from "framer-motion";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8 w-full">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 tracking-[-0.02em]">Ayarlar</h1>
        <p className="text-gray-500 mt-1">Hesap bilgilerinizi ve faturalandırma ayarlarınızı yönetin.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-2xl"
      >
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Profil Ayarları</h3>
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
             <label className="text-[13px] font-medium text-gray-700">Ad Soyad</label>
             <input type="text" placeholder="Adınızı girin" className="px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[13px] font-medium text-gray-700">Hesap Tipi</label>
             <div className="px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-500 cursor-not-allowed">Ücretsiz Plan</div>
          </div>
          <button className="mt-4 px-6 py-2 bg-gray-900 text-white font-medium text-sm rounded-lg hover:bg-gray-800 transition-colors">
            Kaydet
          </button>
        </div>
      </motion.div>
    </div>
  );
}
