"use client";

import { Home, UploadCloud, Crown, LayoutDashboard, Zap, Activity, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GlowCard } from "@/components/spotlight-card";

export default function DashboardOverviewPage() {
  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-[-0.02em]">Ana Panel</h1>
          <p className="text-gray-500 mt-1">Tekrar hoş geldiniz, ölçümlerinize ve planınıza buradan göz atın.</p>
        </div>
        <Link href="/#fiyatlandirma" className="hidden sm:flex px-5 py-2.5 rounded-xl font-semibold text-[14px] items-center gap-2 text-white shadow-sm transition-all hover:scale-[1.03] active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
          <Crown className="w-4 h-4" /> Pro'ya Yükselt
        </Link>
      </motion.div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[14px] font-semibold text-gray-900">Ölçüm Hakkı</span>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900 tracking-tighter">1</span>
              <span className="text-gray-400 font-medium">/ 3</span>
            </div>
            <p className="text-[13px] text-gray-500 mt-2">Kullanılan ücretsiz ölçüm sayısı</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[14px] font-semibold text-gray-900">Mevcut Plan</span>
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <div className="text-3xl font-bold text-gray-900 tracking-tighter">Ücretsiz</div>
            <p className="text-[13px] text-amber-600 font-medium mt-2 bg-amber-50 px-2 py-1 rounded inline-block">
              Sınırlı Erişim
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[14px] font-semibold text-gray-900">Profil Durumu</span>
            <Zap className="w-4 h-4 text-teal-500" />
          </div>
          <div className="mt-2">
            <div className="text-3xl font-bold text-gray-900 tracking-tighter">100%</div>
            <p className="text-[13px] text-teal-600 font-medium mt-2 bg-teal-50 px-2 py-1 rounded inline-block">
              Hesap kurulumu tamamlandı
            </p>
          </div>
        </motion.div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/dashboard/olcum">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="h-full w-full"
          >
            <GlowCard customSize glowColor="blue" className="group bg-white border border-gray-200 hover:border-indigo-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer h-full flex flex-col items-start relative overflow-hidden">
              <div className="w-12 h-12 bg-gray-50 group-hover:bg-indigo-50 rounded-xl flex items-center justify-center border border-gray-100 mb-6 transition-colors">
                <UploadCloud className="w-6 h-6 text-gray-700 group-hover:text-indigo-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg tracking-[-0.01em] mb-2">Akıllı Ölçüm Başlat</h3>
              <p className="text-gray-500 text-[14px] font-light leading-relaxed">
                Odanızın fotoğrafını yükleyin, yapay zeka ile santimetresine kadar gerçek dünya ölçülerini alın.
              </p>
            </GlowCard>
          </motion.div>
        </Link>

        <Link href="/dashboard/esya-kaldir">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="h-full w-full"
          >
            <GlowCard customSize glowColor="green" className="group bg-white border border-gray-200 hover:border-teal-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer h-full flex flex-col items-start relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-teal-50 text-teal-600 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider z-20">
                YENİ
              </div>
              <div className="w-12 h-12 bg-gray-50 group-hover:bg-teal-50 rounded-xl flex items-center justify-center border border-gray-100 mb-6 transition-colors relative z-10">
                <LayoutDashboard className="w-6 h-6 text-gray-700 group-hover:text-teal-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg tracking-[-0.01em] mb-2 relative z-10">Eşya Kaldır (AI)</h3>
              <p className="text-gray-500 text-[14px] font-light leading-relaxed relative z-10">
                Dolu bir odanın fotoğrafını yükleyin, yapay zeka mekandaki tüm eşyaları silip size boş odayı sunsun.
              </p>
            </GlowCard>
          </motion.div>
        </Link>
      </div>

      {/* Recent Activity List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 tracking-[-0.01em]">Son Ölçümler</h2>
          <Link href="/dashboard/olcum" className="text-[13px] font-medium text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-1 group">
            Tümünü Gör <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
               <Clock className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-1 tracking-[-0.01em]">Henüz ölçümünüz yok</h3>
            <p className="text-gray-500 text-[14px]">İlk ölçümünüzü yapmak için Akıllı Ölçüm'ü başlatın.</p>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
