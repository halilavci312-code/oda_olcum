import { LandingFooter } from "@/components/landing-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function KVKK() {
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-8">KVKK Aydınlatma Metni</h1>
        
        <div className="prose prose-sm md:prose-base dark:prose-invert text-gray-600 dark:text-zinc-400">
          <p className="mb-4">6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel verileriniz veri sorumlusu sıfatıyla AkıllıÖlçüm tarafından aşağıda açıklanan kapsamda işlenebilecektir.</p>
          
          <h2 className="text-xl font-semibold text-gray-800 dark:text-zinc-200 mt-8 mb-4">1. İşlenen Verileriniz Nelerdir?</h2>
          <p className="mb-4">Sistemimize yüklediğiniz görseller, ad, soyad ve e-posta adresiniz ile platform kullanımına yönelik log kayıtlarınız işlenmektedir.</p>
          
          <h2 className="text-xl font-semibold text-gray-800 dark:text-zinc-200 mt-8 mb-4">2. İletişim Formları ve Görsel İşleme</h2>
          <p className="mb-4">Yüklenen mekan görselleri sadece talep ettiğiniz ölçümlemenin yapılması ve teknik analiz süreçlerinin yürütülmesi amacıyla işlenir. Bu veriler sistem altyapılarımızda güvenle saklanmaktadır.</p>
          
          <h2 className="text-xl font-semibold text-gray-800 dark:text-zinc-200 mt-8 mb-4">3. Verilerinizin Aktarılması</h2>
          <p className="mb-4">Kişisel verileriniz kural olarak üçüncü kişilerle paylaşılmamaktadır. Ancak teknik destek süreçlerinde bulut güvenlik tedarikçilerimiz ile sınırlı olarak paylaşılabilmektedir.</p>

          <h2 className="text-xl font-semibold text-gray-800 dark:text-zinc-200 mt-8 mb-4">4. KVKK Uyarınca Haklarınız</h2>
          <p className="mb-4">KVKK md. 11 uyarınca, verilerinizin işlenip işlenmediğini öğrenme, silinmesini isteme, eksikse düzeltilmesini talep etme haklarına sahipsiniz.</p>
          <p>Talepleriniz için <strong>destek@halilavc.com</strong> adresine e-posta gönderebilirsiniz.</p>
        </div>
      </div>

      <LandingFooter />
    </main>
  );
}
