"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, CheckCircle2, Loader2, Camera, User, Layout } from "lucide-react";

export default function PublicMeasurementPage() {
  const [formData, setFormData] = useState({
    customer_name: "",
    room_type: "Salon",
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !formData.customer_name) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fotoğrafı Storage'a Yükle
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("customer_photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Public URL al
      const { data: urlData } = supabase.storage
        .from("customer_photos")
        .getPublicUrl(filePath);

      const photoUrl = urlData.publicUrl;

      // 2. Verileri Tabloya Yaz
      const { error: dbError } = await supabase.from("measurements").insert([
        {
          customer_name: formData.customer_name,
          room_type: formData.room_type,
          photo_url: photoUrl,
        },
      ]);

      if (dbError) throw dbError;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu, lütfen tekrar deneyin.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Başarıyla İletildi!</h1>
          <p className="text-slate-500">
            Ölçümleriniz firmamıza başarıyla ulaştı. Teşekkür ederiz!
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <div className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            Oda Ölçüm Sistemi
          </div>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">Mekan Ölçüm Formu</h1>
          <p className="text-slate-500 mt-2">Odanızın fotoğrafını yükleyerek hemen başlayın.</p>
        </div>

        <form onSubmit={handleUpload} className="bg-white rounded-3xl shadow-xl p-6 md:p-8 space-y-6">
          {/* İsim Soyisim */}
          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4" /> Adınız Soyadınız
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-700 bg-slate-50/50"
              placeholder="Ahmet Yılmaz"
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            />
          </div>

          {/* Oda Tipi */}
          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-slate-700 flex items-center gap-2">
              <Layout className="w-4 h-4" /> Oda Tipi
            </label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-700 bg-slate-50/50"
              value={formData.room_type}
              onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
            >
              <option value="Salon">Salon</option>
              <option value="Düz Oda">Düz Oda</option>
            </select>
          </div>

          {/* Fotoğraf Yükleme */}
          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-slate-700 flex items-center gap-2">
              <Camera className="w-4 h-4" /> A4 Referanslı Fotoğraf
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                required
                className="hidden"
                id="photo-upload"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <label
                htmlFor="photo-upload"
                className={`w-full flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer ${
                  file ? "border-green-400 bg-green-50" : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50"
                }`}
              >
                {file ? (
                  <div className="text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-1">Dosya seçildi (Değiştirmek için tıkla)</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">Fotoğraf Seç veya Çek</p>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG (Maks. 5MB)</p>
                  </div>
                )}
              </label>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              * Lütfen A4 kağıdının fotoğrafta net göründüğünden emin olun.
            </p>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 border-none hover:bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>Gönder ve Ölçüm Al</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
