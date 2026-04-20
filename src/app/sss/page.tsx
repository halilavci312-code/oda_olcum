"use client";
import { LandingFooter } from "@/components/landing-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Sistem nasıl çalışıyor?",
    answer: "Odanızın net bir fotoğrafını sisteme yüklersiniz. Yapay zeka destekli modelimiz duvarları, tavanı ve zemini algılayarak perspektif analizi yapar ve odanın yaklaşık ölçülerini saniyeler içinde hesaplar."
  },
  {
    question: "Ölçüm hassasiyeti nedir? Hata payı var mı?",
    answer: "Ölçümlerimiz %90-95 oranında doğruluk payına sahiptir. Ancak kamera lensi distorsiyonu ve ışık gibi faktörlerden dolayı cm bazında sapmalar yaşanabilir. Tahminlerimiz referans niteliğinde olup kritik kesim/inşaat işlemlerinden önce teyit edilmesi önerilir."
  },
  {
    question: "Fotoğraflarım kaydediliyor mu?",
    answer: "Yüklediğiniz fotoğraflar sadece ölçüm analizi sırasında işlenir ve profilinizde sizin görebilmeniz için saklanır. Dilediğiniz zaman hesabınızdan tüm görselleri silebilirsiniz. Müşteri fotoğrafları açık rıza olmadan genel yapay zeka eğitimlerimizde kullanılmaz."
  },
  {
    question: "Hangi fotoğraf formatları desteklenmektedir?",
    answer: "Şu anda JPG, JPEG, PNG ve WebP formatlarını desteklemekteyiz. En iyi sonuç için odanın geniş açılı (veya .5x zoom ile çekilmiş), köşelerin belirgin olduğu aydınlık fotoğraflar yüklemenizi tavsiye ederiz."
  },
  {
    question: "Sistemi kullanmak ücretli mi?",
    answer: "Deneme amaçlı ilk 3 ölçümünüzü ücretsiz olarak yapabilirsiniz. Sonrasında ihtiyaçlarınıza uygun abonelik veya kredi bazlı satın alma planlarımızdan birini seçebilirsiniz."
  }
];

export default function SSS() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-8 text-center">Sıkça Sorulan Sorular</h1>
        <p className="text-center text-gray-500 dark:text-zinc-400 mb-12">
          AkıllıÖlçüm hakkında en çok merak edilen konuları sizin için derledik.
        </p>
        
        <div className="flex flex-col gap-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className={cn(
                "border rounded-xl px-6 py-5 transition-all duration-300 cursor-pointer",
                openIndex === index 
                  ? "border-zinc-800 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50" 
                  : "border-gray-200 dark:border-zinc-800/50 hover:border-gray-300 dark:hover:border-zinc-700"
              )}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <div className="flex justify-between items-center gap-4">
                <h3 className="text-[15px] font-medium text-gray-900 dark:text-zinc-100">{faq.question}</h3>
                <ChevronDown className={cn(
                  "w-4 h-4 text-gray-500 transition-transform duration-300",
                  openIndex === index ? "rotate-180" : ""
                )} />
              </div>
              <div className={cn(
                "grid transition-all duration-300",
                openIndex === index ? "grid-rows-[1fr] mt-3 opacity-100" : "grid-rows-[0fr] opacity-0"
              )}>
                <div className="overflow-hidden text-sm text-gray-600 dark:text-zinc-400 leading-relaxed pr-8">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <LandingFooter />
    </main>
  );
}
