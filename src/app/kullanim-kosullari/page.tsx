import { LandingFooter } from "@/components/landing-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function KullanimKosullari() {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 font-[family-name:var(--font-geist-sans)] transition-colors duration-300">
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors duration-300 border-b border-gray-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Ana Sayfaya Dön
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <div className="pt-32 pb-20 px-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-8">Kullanım Koşulları</h1>
        
        <div className="prose prose-sm md:prose-base dark:prose-invert text-gray-600 dark:text-zinc-400">
          <p className="mb-4">Son güncellenme tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
          
          <h2 className="text-xl font-semibold text-gray-800 dark:text-zinc-200 mt-8 mb-4">1. Hizmetin Kullanımı</h2>
          <p className="mb-4">AkıllıÖlçüm, kullanıcıların yüklediği mekan fotoğraflarını yapay zeka aracılığıyla analiz ederek ölçüm tahminleri sunar. Bu tahminler referans amaçlıdır ve milimetrik hata payları içerebilir. Sistemin sunduğu ölçümlere dayalı yapılan inşaat, mobilya kesimi vb. kritik işlemlerden doğacak zararlardan AkıllıÖlçüm sorumlu tutulamaz.</p>
          
          <h2 className="text-xl font-semibold text-gray-800 dark:text-zinc-200 mt-8 mb-4">2. Kabul Edilebilir Kullanım</h2>
          <p className="mb-4">Sistemi yalnızca yasal ve izinli olduğunuz mekanların fotoğraflarını yükleyerek kullanabilirsiniz. Başkalarının mahremiyetini ihlal eden veya hukuka aykırı içerikler yüklemek yasaktır.</p>
          
          <h2 className="text-xl font-semibold text-gray-800 dark:text-zinc-200 mt-8 mb-4">3. Fikrî Mülkiyet</h2>
          <p className="mb-4">Site içerisindeki tüm yazılımlar, tasarımlar, logolar ve metinlerin fikri mülkiyet hakları AkıllıÖlçüm'e aittir. İzinsiz kopyalanamaz veya kullanılamaz.</p>

          <h2 className="text-xl font-semibold text-gray-800 dark:text-zinc-200 mt-8 mb-4">4. Hizmet Değişiklikleri</h2>
          <p>AkıllıÖlçüm, dilediği zaman hizmetin özelliklerini değiştirme, ücretli hale getirme veya hizmeti geçici/kalıcı olarak durdurma hakkını saklı tutar.</p>
        </div>
      </div>

      <LandingFooter />
    </main>
  );
}
