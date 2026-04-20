import { LandingFooter } from "@/components/landing-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { ChevronLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Ücretsiz Deneme",
    price: "0₺",
    period: "",
    description: "Sistemi test etmek isteyen kullanıcılar için.",
    features: [
      "3 Adet Oda Ölçümü",
      "Sadece Temel Perspektif Analizi",
      "Geçmiş Ölçümlere 7 Gün Erişim"
    ],
    isPopular: false,
    buttonText: "Hemen Başla",
    href: "/dashboard"
  },
  {
    name: "Pro Paket",
    price: "199₺",
    period: "/ ay",
    description: "Mimarlar, emlakçılar ve sürekli kullanıcılar için.",
    features: [
      "Sınırsız Oda Ölçümü",
      "Yüksek Hassasiyetli AI Modeli",
      "Geçmiş Ölçümlere Sınırsız Erişim",
      "Öncelikli E-posta Desteği",
      "PDF Olarak Dışa Aktarma"
    ],
    isPopular: true,
    buttonText: "Pro'ya Geç",
    href: "/pro-satin-al" // Geçiçi link
  }
];

export default function Fiyatlandirma() {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 font-[family-name:var(--font-geist-sans)] transition-colors duration-300 flex flex-col">
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors duration-300 border-b border-gray-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Ana Sayfaya Dön
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <div className="flex-1 pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-zinc-100 mb-6 text-center tracking-tight">
            Basit ve Şeffaf Fiyatlandırma
          </h1>
          <p className="text-center text-gray-500 dark:text-zinc-400 mb-16 max-w-xl text-lg">
            İhtiyacınıza en uygun planı seçin, saniyeler içinde odanızı ölçmeye başlayın. Gizli ücret veya sözleşme yok.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            {plans.map((plan, index) => (
              <div 
                key={index}
                className={cn(
                  "relative rounded-3xl p-8 flex flex-col border transition-all duration-300",
                  plan.isPopular 
                    ? "bg-zinc-900 border-zinc-800 text-white shadow-2xl dark:bg-zinc-100 dark:border-zinc-200 dark:text-zinc-900 transform md:-translate-y-4" 
                    : "bg-white border-gray-200 text-gray-900 dark:bg-zinc-900/50 dark:border-zinc-800 dark:text-zinc-100"
                )}
              >
                {plan.isPopular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full text-[13px] font-medium text-white shadow-sm whitespace-nowrap">
                    En Çok Tercih Edilen
                  </div>
                )}
                
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <p className={cn("text-sm mb-6 min-h-[40px]", plan.isPopular ? "text-zinc-400 dark:text-zinc-500" : "text-gray-500 dark:text-zinc-400")}>
                  {plan.description}
                </p>
                
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  <span className={cn("text-sm font-medium", plan.isPopular ? "text-zinc-400 dark:text-zinc-500" : "text-gray-500 dark:text-zinc-400")}>{plan.period}</span>
                </div>
                
                <ul className="flex flex-col gap-4 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={cn("w-5 h-5 shrink-0", plan.isPopular ? "text-blue-400 dark:text-indigo-600" : "text-gray-900 dark:text-zinc-100")} />
                      <span className="text-[15px]">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link 
                  href={plan.href}
                  className={cn(
                    "w-full py-4 rounded-xl font-semibold text-[15px] transition-colors text-center",
                    plan.isPopular 
                      ? "bg-white text-zinc-900 hover:bg-gray-100 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800" 
                      : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-gray-100"
                  )}
                >
                  {plan.buttonText}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      <LandingFooter />
    </main>
  );
}
