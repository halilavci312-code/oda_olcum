"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  User as UserIcon, 
  Mail, 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  Crown,
  Ruler,
  Globe,
  Palette,
  Moon,
  Sun,
  Monitor
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  
  const [measurementUnit, setMeasurementUnit] = useState("metric");
  const [language, setLanguage] = useState("tr");

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setEmail(session.user.email || "");
      }
      setLoading(false);
    });
  }, []);

  const handleSave = () => {
    toast.success("Ayarlarınız başarıyla güncellendi.");
  };

  return (
    <div className="flex flex-col gap-8 w-full pb-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">Ayarlar</h1>
        <p className="text-gray-500 dark:text-zinc-400 mt-1">Hesap bilgilerinizi, abonelik planınızı ve uygulama tercihlerini yönetin.</p>
      </motion.div>

      <div className="max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sol Kolon - Plan & Profil */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          {/* Kurumsal Plan Kartı */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
            className="bg-gradient-to-br from-zinc-900 to-black dark:from-zinc-100 dark:to-zinc-300 rounded-3xl shadow-xl overflow-hidden relative border border-gray-800 dark:border-white/20"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-10">
              <Building2 className="w-48 h-48 text-white dark:text-black" />
            </div>
            
            <div className="relative p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 dark:bg-black/5 flex items-center justify-center border border-white/20 dark:border-black/10 backdrop-blur-sm">
                    <Crown className="w-6 h-6 text-yellow-500 dark:text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white dark:text-black tracking-tight">Kurumsal Plan</h3>
                    <p className="text-sm text-zinc-400 dark:text-zinc-600">İşletmenize özel sınırsız erişim</p>
                  </div>
                </div>
                <div className="px-4 py-2 bg-yellow-500/20 dark:bg-orange-500/10 text-yellow-400 dark:text-orange-600 border border-yellow-500/30 dark:border-orange-500/20 rounded-xl text-sm font-bold backdrop-blur-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 dark:bg-orange-500 animate-pulse" />
                  Limitsiz
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-zinc-300 dark:text-zinc-700">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 dark:text-indigo-600" />
                  <span className="text-sm font-medium">Sınırsız görsel render ve yapay zeka işlemi</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-300 dark:text-zinc-700">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 dark:text-indigo-600" />
                  <span className="text-sm font-medium">Tüm kumaş ve renk varyasyonlarına sınırsız erişim</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-300 dark:text-zinc-700">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 dark:text-indigo-600" />
                  <span className="text-sm font-medium">Öncelikli destek ve atanmış hesap yöneticisi</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Profil Kartı */}
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
                <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">Oturum Bilgileri</h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400">Şu anda bağlı olan hesabınız</p>
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
                   Aktif
                 </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sağ Kolon - Uygulama Ayarları */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-sm p-8 transition-colors h-full flex flex-col pt-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center border border-violet-100 dark:border-violet-500/20">
                 <Palette className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">Tercihler</h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400">Uygulama deneyiminizi ayarlayın</p>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              
              {/* Tema Seçimi */}
              {mounted && (
                <div className="flex flex-col gap-3">
                   <label className="text-[13px] font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-2 mb-1">
                     <Monitor className="w-3.5 h-3.5" /> Sistem Teması
                   </label>
                   <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => setTheme('light')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${theme === 'light' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-500/40 dark:text-indigo-300 shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 focus:ring-2 focus:ring-indigo-500/20 outline-none'}`}
                      >
                        <Sun className="w-5 h-5 mb-2" />
                        <span className="text-xs font-semibold">Açık</span>
                      </button>
                      <button 
                        onClick={() => setTheme('dark')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${theme === 'dark' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-500/40 dark:text-indigo-300 shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 focus:ring-2 focus:ring-indigo-500/20 outline-none'}`}
                      >
                        <Moon className="w-5 h-5 mb-2" />
                        <span className="text-xs font-semibold">Koyu</span>
                      </button>
                      <button 
                        onClick={() => setTheme('system')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${theme === 'system' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-500/40 dark:text-indigo-300 shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 focus:ring-2 focus:ring-indigo-500/20 outline-none'}`}
                      >
                        <Monitor className="w-5 h-5 mb-2" />
                        <span className="text-xs font-semibold">Sistem</span>
                      </button>
                   </div>
                </div>
              )}

              {/* Ölçüm Birimi Seçimi */}
              <div className="flex flex-col gap-2">
                 <label className="text-[13px] font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-2 mb-1">
                   <Ruler className="w-3.5 h-3.5" /> Ölçüm Birimi
                 </label>
                 <div className="relative">
                   <select 
                     value={measurementUnit}
                     onChange={(e) => setMeasurementUnit(e.target.value)}
                     className="w-full appearance-none px-4 py-3 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 rounded-xl text-[14px] text-gray-900 dark:text-zinc-100 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all cursor-pointer"
                   >
                     <option value="metric">Metrik (cm, metre)</option>
                     <option value="imperial">İmparatorluk (inç, feet)</option>
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                   </div>
                 </div>
              </div>

              {/* Dil Seçimi */}
              <div className="flex flex-col gap-2">
                 <label className="text-[13px] font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-2 mb-1">
                   <Globe className="w-3.5 h-3.5" /> Arayüz Dili
                 </label>
                 <div className="relative">
                   <select 
                     value={language}
                     onChange={(e) => setLanguage(e.target.value)}
                     className="w-full appearance-none px-4 py-3 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 rounded-xl text-[14px] text-gray-900 dark:text-zinc-100 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all cursor-pointer"
                   >
                     <option value="tr">Türkçe (TR)</option>
                     <option value="en">English (EN)</option>
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                   </div>
                 </div>
              </div>
              
            </div>

            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-zinc-800">
              <button 
                onClick={handleSave} 
                className="w-full px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black font-bold text-sm rounded-xl hover:bg-neutral-800 dark:hover:bg-gray-200 transition-all shadow-[0_4px_14px_0_rgb(0,0,0,10%)] dark:shadow-none hover:shadow-[0_6px_20px_rgba(0,0,0,0.23)] dark:hover:shadow-[0_4px_14px_0_rgba(255,255,255,0.3)] shadow-neutral-500/50 hover:-translate-y-0.5 active:translate-y-0"
              >
                Tüm Tercihleri Kaydet
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
