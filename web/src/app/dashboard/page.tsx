"use client";

import { useEffect, useState, useCallback } from "react";
import { UploadCloud, Image as ImageIcon, X, Clock, Settings, Maximize2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface DBMeasurement {
  id: string;
  customer_name: string;
  room_type: string;
  photo_url: string;
  wall_width_cm: number;
  wall_height_cm: number;
  created_at: string;
}

export default function DashboardOverviewPage() {
  const [history, setHistory] = useState<DBMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;
      
      const { data, error } = await supabase
        .from("measurements")
        .select("id, customer_name, room_type, photo_url, wall_width_cm, wall_height_cm, created_at")
        .order("created_at", { ascending: false });
        
      if (!error && data) {
        setHistory(data as any);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">Müşteri Ölçümleri</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-1">Sisteme yüklenen tüm fotoğraf ve ölçüm taleplerini görüntüleyin.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/olcum" className="flex px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-colors items-center gap-2 shadow-sm">
            <UploadCloud className="w-4 h-4" /> Yeni Ölçüm Yükle
          </Link>
        </div>
      </div>

      {/* Spreadsheet / Data Table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 dark:bg-zinc-900/50 border-b border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 font-medium transition-colors">
              <tr>
                <th className="px-6 py-4">Tarih</th>
                <th className="px-6 py-4">Müşteri Adı</th>
                <th className="px-6 py-4">Oda Tipi</th>
                <th className="px-6 py-4">Ölçüler (G x Y)</th>
                <th className="px-6 py-4">Fotoğraf</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80 text-gray-700 dark:text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-zinc-500">
                    <div className="flex justify-center items-center gap-2">
                      <Settings className="w-5 h-5 animate-spin text-gray-400 dark:text-zinc-600" />
                      <span>Veriler Yükleniyor...</span>
                    </div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-14 h-14 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                        <Clock className="w-6 h-6 text-gray-300 dark:text-zinc-600" />
                      </div>
                      <p className="text-gray-900 dark:text-zinc-200 font-medium">Kayıtlı Ölçüm Bulunamadı</p>
                      <p className="text-gray-500 dark:text-zinc-500 text-sm mt-1">Yeni ölçüm talebi geldiğinde burada listelenecektir.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors duration-200">
                    <td className="px-6 py-4 text-gray-500 dark:text-zinc-400 text-[13px]">
                      {format(new Date(item.created_at), "dd MMM yyyy, HH:mm", { locale: tr })}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-zinc-100">{item.customer_name || "-"}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-semibold">
                        {item.room_type || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-zinc-300">
                      {item.wall_width_cm && item.wall_height_cm 
                        ? <span className="font-medium text-slate-900 dark:text-zinc-100">{item.wall_width_cm}cm x {item.wall_height_cm}cm</span>
                        : <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 px-2 py-1 rounded text-xs font-medium border border-amber-200 dark:border-amber-500/20">Fotoğraf Yüklendi (Ölçüm Bekliyor)</span>}
                    </td>
                    <td className="px-6 py-4">
                      {item.photo_url ? (
                        <button 
                          onClick={() => setSelectedPhoto(item.photo_url)}
                          className="w-12 h-10 rounded border border-gray-200 dark:border-zinc-700 overflow-hidden relative group shadow-sm bg-white dark:bg-zinc-800"
                        >
                          <img src={item.photo_url} alt="Room" className="w-full h-full object-cover group-hover:scale-110 transition-transform" crossOrigin="anonymous"/>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                             <Maximize2 className="w-4 h-4" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-12 h-10 rounded border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/80 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-gray-300 dark:text-zinc-600" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo View Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-5xl w-full bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-2xl transition-colors duration-300" onClick={e => e.stopPropagation()}>
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="w-10 h-10 bg-black/50 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors backdrop-blur shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={selectedPhoto} alt="Önizleme" className="w-full h-auto max-h-[85vh] object-contain bg-slate-100 dark:bg-zinc-950 shadow-inner" crossOrigin="anonymous"/>
          </div>
        </div>
      )}
    </div>
  );
}
