"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { CheckCircle2, User as UserIcon, Mail, ShieldCheck, CreditCard } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setEmail(session.user.email || "");
      }
      setLoading(false);
    });
  }, []);

  const handleSave = () => {
    toast.success("Profil ayarları başarıyla kaydedildi.");
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">Ayarlar</h1>
        <p className="text-gray-500 dark:text-zinc-400 mt-1">Hesap bilgilerinizi ve faturalandırma ayarlarınızı yönetin.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-sm p-8 transition-colors"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
               <UserIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">Profil Bilgileri</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Mevcut oturum bilgileriniz</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-2">
               <label className="text-[13px] font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                 <Mail className="w-3.5 h-3.5" /> E-Posta Adresi
               </label>
               <input 
                 disabled
                 type="text" 
                 value={email || (loading ? "Yükleniyor..." : "Bulunamadı")} 
                 className="px-4 py-3 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 rounded-xl text-[14px] text-gray-500 dark:text-zinc-400 cursor-not-allowed outline-none" 
               />
            </div>

            <div className="flex flex-col gap-2">
               <label className="text-[13px] font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                 <ShieldCheck className="w-3.5 h-3.5" /> Hesap Durumu
               </label>
               <div className="px-4 py-3 border border-gray-100 dark:border-zinc-800 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl text-[14px] font-medium flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 Aktif - Ücretsiz Plan
               </div>
            </div>

            <button 
              onClick={handleSave} 
              className="w-full mt-4 px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-bold text-sm rounded-xl hover:bg-neutral-800 dark:hover:bg-gray-200 transition-all shadow-md shadow-gray-200 dark:shadow-none active:scale-[0.98]"
            >
              Değişiklikleri Kaydet
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-sm p-8 transition-colors"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center border border-amber-100 dark:border-amber-500/20">
               <CreditCard className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">Üyelik ve Ödeme</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Ölçüm limitlerinizi yükseltin</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800">
            <h4 className="font-bold text-gray-900 dark:text-zinc-100 mb-2">Pro Plan'ı Keşfedin</h4>
            <p className="text-[13px] text-gray-500 dark:text-zinc-400 leading-relaxed mb-6">
              Sınırsız ölçüm hakkı, ArUco desteği ve özel AI modelleri için Pro pakete geçiş yapabilirsiniz.
            </p>
            <Link 
              href="/#fiyatlandirma"
              className="w-full flex items-center justify-center px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-[14px] font-bold text-gray-900 dark:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all shadow-sm"
            >
              Planları Görüntüle
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
