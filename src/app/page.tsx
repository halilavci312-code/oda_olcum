import { BackgroundPaths } from "@/components/ui/background-paths";
import { HowItWorks } from "@/components/how-it-works";
import { AuthModal } from "@/components/auth-modal";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 font-[family-name:var(--font-geist-sans)] transition-colors duration-300">
      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors duration-300">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #111111, #333333)" }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="font-semibold text-[15px] text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">
              AkıllıÖlçüm
            </span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-gray-500 dark:text-zinc-400">
            <a href="#nasil-calisir" className="hover:text-gray-900 dark:hover:text-zinc-200 transition-colors duration-200">
              Nasıl Çalışır
            </a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <ThemeToggle />
            <AuthModal />
          </div>
        </div>
        {/* Bottom border */}
        <div className="h-px bg-gray-200 dark:bg-zinc-800 transition-colors duration-300" />
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <BackgroundPaths title="Mekanınızı Ölçün ve Evinizde Görün" />

      {/* ── How it Works ───────────────────────────────────── */}
      <HowItWorks />

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-colors duration-300">
        <div className="container mx-auto px-6 py-12 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #111111, #333333)" }}>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span className="text-[14px] font-medium text-gray-500 dark:text-zinc-400">AkıllıÖlçüm</span>
            </div>
            <p className="text-[13px] text-gray-400 dark:text-zinc-500 font-light">
              © 2026 AkıllıÖlçüm. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
