"use client";

import { motion } from "framer-motion";
import React, {
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
} from "react";
import confetti from "canvas-confetti";
import Link from "next/link";
import { Check, Star as LucideStar } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GlowCard } from "@/components/spotlight-card";
import { StarButton } from "@/components/star-button";

// --- UTILITY FUNCTIONS ---

export function useMediaQuery(query: string) {
  const [value, setValue] = useState(false);

  useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches);
    }

    const result = matchMedia(query);
    result.addEventListener("change", onChange);
    setValue(result.matches);

    return () => result.removeEventListener("change", onChange);
  }, [query]);

  return value;
}

// --- PRICING COMPONENT LOGIC ---

export interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular?: boolean;
}

export interface PricingSectionProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
}

// Context
const PricingContext = createContext<{
  isMonthly: boolean;
  setIsMonthly: (value: boolean) => void;
}>({
  isMonthly: true,
  setIsMonthly: () => {},
});

// Main PricingSection Component
export function PricingSection({
  plans,
  title = "Basit, Şeffaf Fiyatlandırma",
  description = "Size en uygun planı seçin.",
}: PricingSectionProps) {
  const [isMonthly, setIsMonthly] = useState(true);

  return (
    <PricingContext.Provider value={{ isMonthly, setIsMonthly }}>
      <div className="relative w-full py-32 z-10">
        <div className="relative container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="max-w-2xl mx-auto text-center space-y-5 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 bg-gray-50 backdrop-blur-sm text-[13px] shadow-sm font-medium text-gray-500"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Fiyatlandırma
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold tracking-[-0.03em] text-gray-900"
            >
              {title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-gray-500 text-lg font-light"
            >
              {description}
            </motion.p>
          </div>
          <PricingToggle />
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 items-start gap-6">
            {plans.map((plan, index) => (
              <PricingCard key={index} plan={plan} index={index} />
            ))}
          </div>
        </div>
      </div>
    </PricingContext.Provider>
  );
}

// Pricing Toggle Component
function PricingToggle() {
  const { isMonthly, setIsMonthly } = useContext(PricingContext);
  const confettiRef = useRef<HTMLDivElement>(null);
  const monthlyBtnRef = useRef<HTMLButtonElement>(null);
  const annualBtnRef = useRef<HTMLButtonElement>(null);
  const [pillStyle, setPillStyle] = useState({});

  useEffect(() => {
    const btnRef = isMonthly ? monthlyBtnRef : annualBtnRef;
    if (btnRef.current) {
      setPillStyle({
        width: btnRef.current.offsetWidth,
        transform: `translateX(${btnRef.current.offsetLeft}px)`,
      });
    }
  }, [isMonthly]);

  const handleToggle = (monthly: boolean) => {
    if (isMonthly === monthly) return;
    setIsMonthly(monthly);
    if (!monthly && confettiRef.current) {
      const rect = annualBtnRef.current?.getBoundingClientRect();
      if (!rect) return;
      confetti({
        particleCount: 80,
        spread: 80,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
        colors: ["#6366f1", "#14b8a6", "#a5b4fc"],
        ticks: 300,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
      });
    }
  };

  return (
    <div className="flex justify-center">
      <div ref={confettiRef} className="relative flex w-fit items-center rounded-full bg-gray-100 border border-gray-200 p-1 shadow-inner">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full p-1 shadow-sm"
          style={{ ...pillStyle, background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
        <button
          ref={monthlyBtnRef}
          onClick={() => handleToggle(true)}
          className={cn(
            "relative z-10 rounded-full px-5 py-2 text-[13px] font-medium transition-colors",
            isMonthly ? "text-white" : "text-gray-500 hover:text-gray-700"
          )}
        >
          Aylık
        </button>
        <button
          ref={annualBtnRef}
          onClick={() => handleToggle(false)}
          className={cn(
            "relative z-10 rounded-full px-5 py-2 text-[13px] font-medium transition-colors",
            !isMonthly ? "text-white" : "text-gray-500 hover:text-gray-700"
          )}
        >
          Yıllık
          <span className={cn("hidden sm:inline ml-1", !isMonthly ? "text-indigo-100" : "text-gray-400")}>
            (20% Tasarruf)
          </span>
        </button>
      </div>
    </div>
  );
}

// Pricing Card Component
function PricingCard({ plan, index }: { plan: PricingPlan; index: number }) {
  const { isMonthly } = useContext(PricingContext);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      whileInView={{
        y: plan.isPopular && isDesktop ? -16 : 0,
        opacity: 1,
      }}
      viewport={{ once: true }}
      transition={{
        duration: 0.6,
        type: "spring",
        stiffness: 100,
        damping: 20,
        delay: index * 0.12,
      }}
      className="h-full w-full"
    >
      <GlowCard
        customSize
        glowColor={plan.isPopular ? "purple" : "blue"}
        className={cn(
          "h-full w-full rounded-2xl p-8 flex flex-col relative",
          plan.isPopular
            ? "border-none bg-white/95 shadow-[0_0_40px_rgba(99,102,241,0.15)]"
            : "border border-gray-200 bg-white/90 hover:border-gray-300 hover:shadow-sm transition-all duration-300"
        )}
      >
        {plan.isPopular && (
          <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 z-20">
            <div className="py-1.5 px-4 rounded-full flex items-center gap-1.5 shadow-md" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
              <LucideStar className="text-white h-3.5 w-3.5 fill-current" />
              <span className="text-white text-[12px] font-semibold">En Popüler</span>
            </div>
          </div>
        )}
        <div className="flex-1 flex flex-col text-center relative z-10">
          <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
          <p className="mt-2 text-[13px] text-gray-500 font-light">{plan.description}</p>
          <div className="mt-6 flex items-baseline justify-center gap-x-1">
            <span className="text-5xl font-bold tracking-tight text-gray-900">
              <NumberFlow
                value={isMonthly ? Number(plan.price) : Number(plan.yearlyPrice)}
                format={{ style: "currency", currency: "TRY", minimumFractionDigits: 0 }}
                className="font-variant-numeric: tabular-nums"
              />
            </span>
            <span className="text-[13px] font-medium text-gray-400">/ {plan.period}</span>
          </div>
          <p className="text-[12px] text-gray-400 mt-2">
            {isMonthly ? "Aylık Faturalandırılır" : "Yıllık Faturalandırılır"}
          </p>

          <ul role="list" className="mt-8 space-y-3 text-[13px] text-left text-gray-600 font-light">
            {plan.features.map((feature) => (
              <li key={feature} className="flex gap-x-3 items-center">
                <Check
                  className={cn("h-4 w-4 flex-none", plan.isPopular ? "text-indigo-500" : "text-gray-400")}
                  aria-hidden="true"
                />
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-8 w-full flex justify-center">
            {plan.isPopular ? (
              <StarButton className="w-full text-[14px] font-semibold h-11 pointer-events-auto">
                {plan.buttonText}
              </StarButton>
            ) : (
              <Link
                href={plan.href}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full rounded-2xl text-[14px] font-semibold h-11 transition-all z-20 relative",
                  "bg-transparent border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {plan.buttonText}
              </Link>
            )}
          </div>
        </div>
      </GlowCard>
    </motion.div>
  );
}
