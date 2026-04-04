"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabase } from "@/lib/supabase";
import { Loader as Loader2, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AuthModal({ children, redirectUrl = "/dashboard" }: { children?: React.ReactNode; redirectUrl?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true);
    });

    const checkHash = () => {
      if (window.location.hash === "#login") {
        setIsOpen(true);
        window.history.replaceState(null, "", window.location.pathname);
      }
    };
    
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  const handleReset = () => {
    setEmail(""); setPassword(""); setName(""); setError(""); setSuccess(""); setIsForgotPassword(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);

    if (isForgotPassword) {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) setError(error.message);
      else setSuccess("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi!");
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message === "Invalid login credentials" ? "E-posta veya şifre hatalı." : error.message);
      } else if (data.session) {
        setTimeout(() => { window.location.href = redirectUrl; }, 1500);
      }
    } else {
      if (password.length < 6) { setError("Şifre en az 6 karakter olmalıdır."); setLoading(false); return; }
      const { data, error } = await getSupabase().auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      });
      if (error) setError(error.message);
      else if (!data.session) setSuccess("Kayıt başarılı! Lütfen e-postanıza gelen doğrulama linkine tıklayın.");
      else {
        setSuccess("Hesap oluşturuldu! Yönlendiriliyorsunuz...");
        setTimeout(() => { window.location.href = redirectUrl; }, 1500);
      }
    }
    setLoading(false);
  };

  const getTitle = () => isForgotPassword ? "Şifrenizi Sıfırlayın" : isLogin ? "Tekrar Hoş Geldiniz" : "Hesap Oluşturun";
  const getSubtitle = () =>
    isForgotPassword
      ? "E-posta adresinize bir sıfırlama bağlantısı göndereceğiz."
      : isLogin
      ? "Giriş yaparak ölçümlerinize devam edin."
      : "Yeni bir hesap oluşturun ve hemen başlayın.";

  if (hasSession) {
    if (children) {
      return (
        <div onClick={() => { window.location.href = redirectUrl; }} className="cursor-pointer inline-block">
          {children}
        </div>
      );
    }
    return (
      <button
        onClick={() => { window.location.href = redirectUrl; }}
        className="relative overflow-hidden px-5 py-2 rounded-full text-[13px] font-semibold text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
        style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
      >
        <span className="relative z-10">Panele Git</span>
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-200%] hover:translate-x-[200%] transition-transform duration-700" />
      </button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if (!val) handleReset(); }}>
      {children ? (
        <DialogTrigger render={children as any} />
      ) : (
        <DialogTrigger className="relative overflow-hidden px-5 py-2 rounded-full text-[13px] font-semibold text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
          style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
        >
          <span className="relative z-10">Giriş Yap / Kaydol</span>
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-200%] hover:translate-x-[200%] transition-transform duration-700" />
        </DialogTrigger>
      )}
      
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-[#0c0f1a] border-white/[0.08] text-white rounded-2xl">
        {/* Gradient glow top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] rounded-full opacity-[0.08] pointer-events-none"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }} />

        <div className="relative p-8">
          <DialogHeader className="mb-6 space-y-2">
            <div className="flex items-center gap-3">
              {isForgotPassword && (
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setIsLogin(true); setError(""); setSuccess(""); }}
                  className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition"
                >
                  <ArrowLeft className="w-4 h-4 text-white/50" />
                </button>
              )}
              <DialogTitle className="text-xl font-semibold tracking-[-0.02em]">{getTitle()}</DialogTitle>
            </div>
            <p className="text-white/35 text-[13px]">{getSubtitle()}</p>
          </DialogHeader>

          <form onSubmit={handleAuth} className="space-y-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {!isLogin && !isForgotPassword && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <Label htmlFor="name" className="text-white/50 text-[13px] font-medium">Ad Soyad</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input
                      id="name" type="text" placeholder="Adınız Soyadınız"
                      className="pl-10 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/30 rounded-xl text-[14px]"
                      value={name} onChange={(e) => setName(e.target.value)} required={!isLogin}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-white/50 text-[13px] font-medium">E-Posta</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <Input
                  id="email" type="email" placeholder="ornek@mail.com"
                  className="pl-10 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/30 rounded-xl text-[14px]"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                />
              </div>
            </div>

            <AnimatePresence mode="popLayout" initial={false}>
              {!isForgotPassword && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-white/50 text-[13px] font-medium">Şifre</Label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => { setIsForgotPassword(true); setError(""); setSuccess(""); }}
                        className="text-[12px] text-indigo-400/70 hover:text-indigo-400 font-medium transition"
                      >
                        Şifremi unuttum
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input
                      id="password" type="password" placeholder="••••••••"
                      className="pl-10 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/30 rounded-xl text-[14px]"
                      value={password} onChange={(e) => setPassword(e.target.value)} required={!isForgotPassword}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="text-red-400 text-[13px] text-center font-medium bg-red-400/[0.06] py-2.5 rounded-xl border border-red-400/[0.1]"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="text-emerald-400 text-[13px] text-center font-medium bg-emerald-400/[0.06] py-2.5 rounded-xl border border-emerald-400/[0.1]"
                >
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit" disabled={loading}
              className="w-full h-11 rounded-xl font-semibold text-[14px] transition-all duration-300"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isForgotPassword ? "Sıfırlama Linki Gönder" : isLogin ? "Giriş Yap" : "Hesap Oluştur"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.06]" /></div>
          </div>

          {/* Toggle */}
          {!isForgotPassword && (
            <div className="text-center text-[13px] text-white/30">
              {isLogin ? "Hesabınız yok mu?" : "Zaten hesabınız var mı?"}{" "}
              <button
                type="button"
                className="text-indigo-400 hover:text-indigo-300 font-medium transition"
                onClick={() => { setIsLogin(!isLogin); handleReset(); }}
              >
                {isLogin ? "Kayıt Olun" : "Giriş Yapın"}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
