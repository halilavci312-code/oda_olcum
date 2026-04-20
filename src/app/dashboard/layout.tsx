"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Loader2, Home, BarChart2, Crop, Settings, LogOut, Menu, X, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
    // TEMPORARILY DISABLED AUTH CHECK
    setUser({ email: "Misafir Kullanıcı (Giriş Devre Dışı)", id: "guest-id" } as any);
    setAuthLoading(false);
    
    // Auth logic temporarily commented out:
    /*
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/";
      } else {
        setUser(session.user);
        setAuthLoading(false);
      }
    });
    */
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-[14px]">Oturum kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { label: "Ana Panel", icon: Home, href: "/dashboard" },
    { label: "Akıllı Ölçüm", icon: Crop, href: "/dashboard/olcum" },
    { label: "Görsel Yerleştirme", icon: BarChart2, href: "/dashboard/esya-kaldir" },
    { label: "Ayarlar", icon: Settings, href: "/dashboard/settings" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex text-gray-900 dark:text-zinc-50 font-sans transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 hidden md:flex flex-col h-screen sticky top-0 transition-colors duration-300">
        <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #111111, #333333)" }}>
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[16px] text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">AkıllıÖlçüm</span>
          </Link>
          
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all text-gray-500 dark:text-zinc-400 group relative overflow-hidden focus:outline-none"
              title={theme === "dark" ? "Açık Mod" : "Koyu Mod"}
            >
              <div className="relative w-5 h-5 flex items-center justify-center">
                <Sun className={`absolute w-5 h-5 transition-all duration-500 transform ${theme === "dark" ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100 text-amber-500"}`} />
                <Moon className={`absolute w-5 h-5 transition-all duration-500 transform ${theme === "dark" ? "opacity-100 rotate-0 scale-100 text-indigo-400" : "opacity-0 -rotate-90 scale-50"}`} />
              </div>
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-6 gap-2 flex flex-col">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[14px] font-medium ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold"
                    : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100"
                }`}
              >
                <item.icon className={`w-4 h-4 transition-colors ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-zinc-500"}`} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex-shrink-0">
          <div className="px-3 py-3 rounded-lg border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 flex flex-col gap-2 mb-4">
             <span className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Hesabım</span>
             <span className="text-[13px] text-gray-900 dark:text-zinc-100 truncate" title={user?.email || ""}>
               {user?.email}
             </span>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
            className="w-full mb-4 px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-500/20 transition-all text-[13px] font-medium flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Çıkış Yap
          </button>
          
          <div className="flex flex-col items-center justify-center pt-2 border-t border-gray-100/50 dark:border-zinc-800/50">
            <div className="flex flex-col items-center opacity-50 hover:opacity-100 transition-opacity duration-300">
              <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-medium tracking-widest uppercase mb-1">Solution Partner</span>
              <div className="flex items-center">
                <span className="font-extrabold text-[15px] tracking-tight text-gray-600 dark:text-zinc-300 font-sans">ewos</span>
                <span className="text-[8px] font-bold text-gray-500 dark:text-zinc-400 relative -top-1.5 ml-0.5">®</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto w-full relative">
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40 transition-colors duration-300">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #111111, #333333)" }}>
              <Home className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-[15px] text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">AkıllıÖlçüm</span>
          </Link>
          <div className="flex items-center gap-3">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-1 rounded-full text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all relative overflow-hidden"
              >
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <Sun className={`absolute w-5 h-5 transition-all duration-500 transform ${theme === "dark" ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100 text-amber-500"}`} />
                  <Moon className={`absolute w-5 h-5 transition-all duration-500 transform ${theme === "dark" ? "opacity-100 rotate-0 scale-100 text-indigo-400" : "opacity-0 -rotate-90 scale-50"}`} />
                </div>
              </button>
            )}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 focus:outline-none transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Slide-over Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Panel */}
            <div className="relative w-72 max-w-[calc(100%-3rem)] bg-white dark:bg-zinc-900 h-full flex flex-col shadow-xl transition-colors duration-300">
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
                <Link href="/" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #111111, #333333)" }}>
                    <Home className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-[16px] text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">AkıllıÖlçüm</span>
                </Link>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto px-4 py-6 gap-2 flex flex-col">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-[15px] font-medium ${
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold"
                          : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-zinc-500"}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex-shrink-0">
                <div className="px-3 py-3 rounded-lg border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 flex flex-col gap-2 mb-4">
                  <span className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Hesabım</span>
                  <span className="text-[13px] text-gray-900 dark:text-zinc-100 truncate" title={user?.email || ""}>
                    {user?.email}
                  </span>
                </div>
                <button
                  onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
                  className="w-full mb-5 px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 hover:border-red-200 transition-all text-[14px] font-medium flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Çıkış Yap
                </button>
                
                <div className="flex flex-col items-center justify-center pt-3 border-t border-gray-100/50 dark:border-zinc-800/50">
                  <div className="flex flex-col items-center opacity-50 hover:opacity-100 transition-opacity duration-300">
                    <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-medium tracking-widest uppercase mb-1">Solution Partner</span>
                    <div className="flex items-center">
                      <span className="font-extrabold text-[15px] tracking-tight text-gray-600 dark:text-zinc-300 font-sans">ewos</span>
                      <span className="text-[8px] font-bold text-gray-500 dark:text-zinc-400 relative -top-1.5 ml-0.5">®</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
