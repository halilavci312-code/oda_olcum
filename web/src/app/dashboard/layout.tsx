"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Loader2, Home, BarChart2, Crop, Settings, LogOut, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/";
      } else {
        setUser(session.user);
        setAuthLoading(false);
      }
    });
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
    { label: "Eşya Kaldır (Yapay Zeka)", icon: BarChart2, href: "/dashboard/esya-kaldir" },
    { label: "Ayarlar", icon: Settings, href: "/dashboard/settings" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #111111, #333333)" }}>
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[16px] text-gray-900 tracking-[-0.02em]">AkıllıÖlçüm</span>
          </Link>
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
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <div className="px-3 py-3 rounded-lg border border-gray-100 bg-gray-50 flex flex-col gap-2 mb-4">
             <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">Hesabım</span>
             <span className="text-[13px] text-gray-900 truncate" title={user?.email || ""}>
               {user?.email}
             </span>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-[13px] font-medium flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto w-full">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #111111, #333333)" }}>
              <Home className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-[15px] text-gray-900 tracking-[-0.02em]">AkıllıÖlçüm</span>
          </Link>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}>
            <LogOut className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
