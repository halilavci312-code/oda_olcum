import { LandingFooter } from "@/components/landing-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function GizlilikPolitikasi() {
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-8">Gizlilik Politikası</h1>
        
        <div className="prose prose-sm md:prose-base dark:prose-invert text-gray-600 dark:text-zinc-400">
          <p className="mb-4">Son güncellenme tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
          
          <h2 className="text-xl font-semibold text-gray-800 dark:text-zinc-200 mt-8 mb-4">1. Toplanan Veriler</h2>
          <p className="mb-4">AkıllıÖlçüm sistemini kullanırken yüklediğiniz oda fotoğrafları, ölçüm ve analiz işlemlerinin gerçekleştirilebilmesi amacıyla sunucularımıza yüklenmektedir. Bu fotoğraflar, yalnızca ölçüm yapay zeka modelleri tarafından analiz edilmek üzere kullanılır.</p>
          
          <h2 className="text-xl font-semibold text-gray-800 dark:text-zinc-200 mt-8 mb-4">2. Verilerin Saklanması ve Silinmesi</h2>
          <p className="mb-4">Kullanıcılar tarafından yüklenen fotoğraflar, ölçüm işlemi tamamlandıktan ve sonuçlar kullanıcıya iletildikten sonra sistemlerimizde barındırılır. Kullanıcı dilediği zaman paneli üzerinden fotoğrafları silebilir.</p>
          
          <h2 className="text-xl font-semibold text-gray-800 dark:text-zinc-200 mt-8 mb-4">3. Yapay Zeka Eğitimi</h2>
          <p className="mb-4">Müşterilerimizin gizliliğine önem veriyoruz. Sisteme yüklenen hiçbir kişisel fotoğraf, yapay zeka modellerimizin genel eğitimi için anonimleştirilmeden veya açık rıza alınmadan <strong>kullanılmaz.</strong></p>

          <h2 className="text-xl font-semibold text-gray-800 dark:text-zinc-200 mt-8 mb-4">4. İletişim</h2>
          <p>Gizlilik süreçlerimizle ilgili her türlü soru ve talebiniz için <strong>destek@halilavc.com</strong> adresinden bize ulaşabilirsiniz.</p>
        </div>
      </div>

      <LandingFooter />
    </main>
  );
}
