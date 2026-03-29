import { PricingSection } from "@/components/ui/pricing";

// Demo data for the pricing plans
const demoPlans = [
  {
    name: "Ücretsiz",
    price: "0",
    yearlyPrice: "0",
    period: "ay",
    features: [
      "Ayda 3 ücretsiz ölçüm",
      "Temel hata payı toleransı",
      "Sadece A4 kağıdıyla ölçüm desteği",
    ],
    description: "Sistemi test etmek isteyen bireysel kullanıcılar için.",
    buttonText: "Hemen Başla",
    href: "#login",
  },
  {
    name: "Pro",
    price: "99",
    yearlyPrice: "79",
    period: "ay",
    features: [
      "Sınırsız fotoğraf ve ölçüm",
      "Gelişmiş AI Analizi",
      "ArUco Marker ile Yüksek Doğruluk",
      "Öncelikli e-posta desteği",
    ],
    description: "İç mimarlar ve e-ticaret satıcıları için ideal çözümler.",
    buttonText: "Pro'ya Geç",
    href: "#login",
    isPopular: true,
  },
  {
    name: "Kurumsal",
    price: "299",
    yearlyPrice: "239",
    period: "ay",
    features: [
      "Tüm Pro avantajları",
      "Kendi platformunuza API Entegrasyonu",
      "Özel hata töleransı modelleri",
      "7-24 Öncelikli Kurumsal Destek",
    ],
    description: "Kendi uygulamasında bu sistemi kullanmak isteyen şirketlere.",
    buttonText: "Bizimle İletişime Geçin",
    href: "#login",
  },
];

// Demo component to showcase the PricingSection
export default function PricingSectionDemo() {
  return (
    <PricingSection
      plans={demoPlans}
      title="Akıllı Fiyatlandırma"
      description="Kişisel veya kurumsal ihtiyaçlarınıza uygun paketi seçin ve anında duvar / mobilya ölçümlerine başlayın."
    />
  );
}
