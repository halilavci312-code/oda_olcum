import { BackgroundPaths } from "@/components/ui/background-paths";
import { HowItWorks } from "@/components/how-it-works";
import { ThemeToggle } from "@/components/theme-toggle";
import { LandingFooter } from "@/components/landing-footer";
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 font-sans transition-colors duration-300">
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
            <a href="/dashboard" className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">
              Hemen Başla
            </a>
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
      <LandingFooter />
    </main>
  );
}
