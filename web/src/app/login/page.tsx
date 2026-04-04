"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Mail, Loader2, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      // Başarılı girişte Dashboard'a yönlendir
      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">İşletme Paneli Girişi</h1>
          <p className="text-slate-500 mt-2">Ölçüm taleplerini yönetmek için giriş yapın.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-600 ml-1">E-posta Adresi</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all text-slate-700 bg-slate-50/30"
                  placeholder="admin@isletme.com"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-600 ml-1">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all text-slate-700 bg-slate-50/30"
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-xs font-semibold p-4 rounded-2xl border border-red-100 flex items-center justify-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 border-none hover:bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 active:scale-[0.98] group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Giriş Yap <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-400 text-sm mt-8">
           Şifre sıfırlama için lütfen sistem yöneticisi ile iletişime geçin.
        </p>
      </motion.div>
    </div>
  );
}
