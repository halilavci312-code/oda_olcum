"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LogOut, Calendar, User, Layout, 
  Ruler, ImageIcon, Eye, X, 
  Loader2, RefreshCw, ChevronRight,
  Database
} from "lucide-react";

interface Measurement {
  id: string;
  created_at: string;
  customer_name: string;
  room_type: string;
  photo_url: string;
  dimensions: string | null;
}

export default function AdminDashboard() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login"); // Giriş yapılmamışsa login sayfasına at
        return;
      }

      const { data, error } = await supabase
        .from("measurements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMeasurements(data || []);
    } catch (err) {
      console.error("Veri çekme hatası:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
             <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none uppercase">İşletme Paneli</h1>
            <p className="text-[11px] font-bold text-indigo-500 mt-1 uppercase tracking-widest">Ölçüm Takip Sistemi</p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-500 hover:text-red-600 font-semibold text-sm transition-colors group bg-slate-50 px-4 py-2 rounded-xl"
        >
          <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-red-500" />
          Çıkış Yap
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 max-w-7xl w-full mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-[-0.03em]">Gelen Ölçüm Talepleri</h2>
            <p className="text-slate-500 mt-1">Sisteme düşen son müşteri ölçümlerini buradan takip edin.</p>
          </div>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all border border-indigo-100/50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Güncelle
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
           <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100/50 flex items-center justify-between overflow-hidden relative group">
              <div className="relative z-10">
                <p className="text-indigo-100 text-[13px] font-bold uppercase tracking-wider mb-2">Toplam Ölçüm</p>
                <h3 className="text-4xl font-black tracking-[-0.02em]">{measurements.length}</h3>
              </div>
              <Database className="w-20 h-20 text-white/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform duration-500" />
           </div>
           
           <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-[13px] font-bold uppercase tracking-wider mb-2">Son Güncelleme</p>
                <h3 className="text-xl font-bold text-slate-900">{format(new Date(), "HH:mm", { locale: tr })}</h3>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center border border-green-100">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              </div>
           </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[12px] font-bold text-slate-400 uppercase tracking-widest">Tarih</th>
                  <th className="px-6 py-5 text-[12px] font-bold text-slate-400 uppercase tracking-widest">Müşteri</th>
                  <th className="px-6 py-5 text-[12px] font-bold text-slate-400 uppercase tracking-widest text-center">Oda Tipi</th>
                  <th className="px-6 py-5 text-[12px] font-bold text-slate-400 uppercase tracking-widest text-center">Ölçü Sonucu</th>
                  <th className="px-6 py-5 text-[12px] font-bold text-slate-400 uppercase tracking-widest text-right">Eylem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && measurements.length === 0 ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-8 h-16 bg-slate-50/20" />
                    </tr>
                  ))
                ) : measurements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-medium italic">
                      Henüz hiç ölçüm kaydı bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  measurements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-300" />
                          <span className="text-[14px] text-slate-600 font-medium leading-none">
                            {format(new Date(m.created_at), "d MMMM, HH:mm", { locale: tr })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
                             {m.customer_name ? m.customer_name[0].toUpperCase() : "?"}
                          </div>
                          <span className="text-[16px] font-bold text-slate-900 tracking-[-0.01em]">{m.customer_name || "İsimsiz Müşteri"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="inline-block px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-[12px] font-bold border border-slate-200">
                          {m.room_type}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                         {m.dimensions ? (
                           <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl font-bold text-[14px] border border-green-100">
                             <Ruler className="w-4 h-4" /> {m.dimensions}
                           </div>
                         ) : (
                           <span className="text-slate-400 text-sm font-medium italic flex items-center justify-center gap-2">
                             <Loader2 className="w-3 h-3 animate-spin" /> Bekleniyor...
                           </span>
                         )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button 
                          onClick={() => setSelectedPhoto(m.photo_url)}
                          className="inline-flex items-center gap-2 bg-slate-900 border-none hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-[13px] shadow-sm transition-all active:scale-[0.95]"
                        >
                          <Eye className="w-4 h-4" /> Fotoğrafı Gör
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPhoto(null)} 
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] shadow-2xl relative z-10 max-w-4xl w-full max-h-[90vh] overflow-hidden border border-white/20"
            >
              <div className="absolute top-6 right-6 z-20">
                <button 
                  onClick={() => setSelectedPhoto(null)}
                  className="bg-slate-900 text-white p-3 rounded-2xl hover:bg-red-600 transition-colors shadow-xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-4 bg-slate-50 flex items-center justify-between px-8 py-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-indigo-600" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-900 tracking-tight">Oda Fotoğrafı</h3>
                </div>
              </div>

              <div className="p-4 flex items-center justify-center bg-slate-100">
                <img 
                  src={selectedPhoto} 
                  alt="Oda Ölçümü" 
                  className="max-h-[70vh] w-auto h-auto rounded-2xl shadow-inner object-contain"
                />
              </div>
              
              <div className="px-8 py-6 bg-white flex items-center justify-between border-t border-slate-100 text-sm">
                 <p className="text-slate-400 font-medium italic underline decoration-slate-200">Fotoğraf referans olarak A4 kağıdı içermektedir.</p>
                 <a 
                   href={selectedPhoto} 
                   target="_blank" 
                   rel="noreferrer"
                   className="text-indigo-600 font-bold hover:underline underline-offset-4"
                 >
                   Orijinal Resme Git
                 </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
