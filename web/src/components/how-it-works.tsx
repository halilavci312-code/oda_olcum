"use client";

import { motion } from "framer-motion";
import { Camera, MousePointerClick, Ruler, ArrowRight } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      id: 1,
      title: "Fotoğraf Çekin",
      description:
        "Ölçmek istediğiniz alanın fotoğrafını çekin. Sahneye bir A4 kağıdı veya ArUco marker yerleştirin.",
      icon: <Camera className="w-6 h-6" />,
      color: "from-violet-500/20 to-indigo-500/20",
      iconBg: "bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20",
      border: "group-hover:border-indigo-500/30",
    },
    {
      id: 2,
      title: "Köşeleri Seçin",
      description:
        "Sisteme yükleyin ve sadece 4 nokta tıklayarak duvar veya mobilyanın köşelerini işaretleyin.",
      icon: <MousePointerClick className="w-6 h-6" />,
      color: "from-teal-500/20 to-emerald-500/20",
      iconBg: "bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20",
      border: "group-hover:border-teal-500/30",
    },
    {
      id: 3,
      title: "Sonucu Alın",
      description:
        "Yapay zeka milimetrik hassasiyetle referans nesneyi kullanarak gerçek boyutları hesaplar.",
      icon: <Ruler className="w-6 h-6" />,
      color: "from-amber-500/20 to-orange-500/20",
      iconBg: "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20",
      border: "group-hover:border-amber-500/30",
    },
  ];

  return (
    <section id="nasil-calisir" className="w-full py-32 relative z-10 bg-white">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl">
        {/* Section header */}
        <div className="text-center mb-20 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 bg-gray-50 backdrop-blur-sm shadow-sm text-[13px] font-medium text-gray-500"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            Nasıl Çalışır
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold tracking-[-0.03em] text-gray-900"
          >
            3 Basit Adımda Ölçüm
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-gray-500 text-lg max-w-xl mx-auto font-light"
          >
            Herhangi bir ölçüm aleti veya teknik bilgiye gerek yok.
            <br />Telefonunuzun kamerası yeterli.
          </motion.p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + index * 0.1 }}
              viewport={{ once: true }}
              className={`group relative rounded-2xl p-8 border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm transition-all duration-500 ${step.border}`}
            >
              {/* Step number — ghost */}
              <div className="absolute top-6 right-6 text-[80px] font-black text-gray-100 leading-none select-none">
                {step.id}
              </div>

              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 ${step.iconBg}`}>
                {step.icon}
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2 tracking-[-0.01em]">{step.title}</h3>
              <p className="text-gray-500 text-[14px] leading-relaxed font-light">{step.description}</p>

              {/* Arrow connector (hidden on last card) */}
              {index < 2 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
