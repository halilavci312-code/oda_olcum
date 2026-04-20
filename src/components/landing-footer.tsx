import Link from "next/link";
import { Mail } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-8">
          
          {/* Sütun 1: Marka & Partnerler */}
          <div className="flex flex-col gap-6 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #111111, #333333)" }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span className="font-semibold text-[16px] text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">
                AkıllıÖlçüm
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed max-w-xs">
              Yapay zeka ile saniyeler içinde odanızı ölçün ve tasarlayın. Geleceğin iç mimari deneyimi.
            </p>
            
            {/* Güven ve Partner (Ewos) */}
            <div className="mt-2">
              <p className="text-[11px] font-semibold tracking-wider text-gray-400 dark:text-zinc-500 uppercase mb-3">
                Çözüm Ortaklarımız
              </p>
              <div className="flex items-center gap-4 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                {/* Geçici Ewos Logosu Yeri, SVG eklenebilir */}
                <div className="flex items-center gap-1.5 cursor-pointer">
                  <div className="w-5 h-5 bg-zinc-800 rounded-sm flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">E</span>
                  </div>
                  <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">EWOS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sütun 2: Gezinme & Destek */}
          <div className="flex flex-col gap-5">
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight">Destek & Gezinme</h3>
            <ul className="flex flex-col gap-[18px]">
              <li>
                <Link href="#nasil-calisir" className="text-[15px] font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                  Nasıl Çalışır?
                </Link>
              </li>
              <li>
                <Link href="/sss" className="text-[15px] font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                  Sıkça Sorulan Sorular
                </Link>
              </li>
              <li>
                <Link href="/fiyatlandirma" className="text-[15px] font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                  Fiyatlandırma
                </Link>
              </li>
              <li>
                <a href="mailto:destek@halilavc.com" className="inline-flex items-center gap-2 text-[15px] font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                  <Mail className="w-3.5 h-3.5" />
                  destek@halilavc.com
                </a>
              </li>
            </ul>
          </div>

          {/* Sütun 3: Yasal Metinler */}
          <div className="flex flex-col gap-5">
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight">Yasal</h3>
            <ul className="flex flex-col gap-[18px]">
              <li>
                <Link href="/gizlilik-politikasi" className="text-[15px] font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                  Gizlilik Politikası
                </Link>
              </li>
              <li>
                <Link href="/kullanim-kosullari" className="text-[15px] font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                  Kullanım Koşulları
                </Link>
              </li>
              <li>
                <Link href="/kvkk" className="text-[15px] font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                  KVKK Aydınlatma Metni
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Alt Kısım: Telif Hakkı & Sosyal Medya */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-zinc-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-gray-400 dark:text-zinc-500 font-light text-center md:text-left">
            © {new Date().getFullYear()} AkıllıÖlçüm. Tüm hakları saklıdır.
          </p>
          
          <div className="flex items-center gap-5">
            <a href="#" className="text-gray-400 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors" aria-label="Instagram">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors" aria-label="X (Twitter)">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors" aria-label="LinkedIn">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
