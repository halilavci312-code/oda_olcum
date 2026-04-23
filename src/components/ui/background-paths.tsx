"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Zap, ShieldCheck, Target, Infinity as InfinityIcon } from "lucide-react";
import { AuthModal } from "@/components/auth-modal";
import { PreviewSteps } from "./preview-steps";

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 696 316" fill="none" preserveAspectRatio="xMidYMid slice">
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="url(#pathGradient)"
            strokeWidth={path.width}
            strokeOpacity={0.06 + path.id * 0.012}
            initial={{ pathLength: 0.3, opacity: 0.4 }}
            animate={{
              pathLength: 1,
              opacity: [0.2, 0.5, 0.2],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
        <defs>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function BackgroundPaths({ title = "Background Paths" }: { title?: string }) {
  const words = title.split(" ");

  return (
    <>
      {/* Fixed background layer */}
      <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_50%_0%,#ffffff_0%,#fafafa_55%)] dark:bg-[radial-gradient(ellipse_at_50%_0%,#111111_0%,#000000_55%)] transition-colors duration-300">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
        {/* Subtle radial glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.03] dark:opacity-[0.08] transition-opacity duration-300"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }} />
      </div>

      {/* Hero section */}
      <div className="relative min-h-screen w-full flex items-center justify-center z-10 pt-20">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="max-w-4xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 backdrop-blur-sm shadow-sm mb-8 transition-colors duration-300"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span className="text-[13px] font-medium text-gray-600 dark:text-zinc-300">Yapay Zeka Destekli Ölçüm</span>
            </motion.div>

            {/* Title */}
            <h1 className="text-5xl sm:text-7xl md:text-[5.5rem] font-bold mb-6 tracking-[-0.04em] leading-[0.95]">
              {words.map((word, wordIndex) => (
                <span key={wordIndex} className="inline-block mr-4 last:mr-0">
                  {word.split("").map((letter, letterIndex) => (
                    <motion.span
                      key={`${wordIndex}-${letterIndex}`}
                      initial={{ y: 60, opacity: 0, filter: "blur(8px)" }}
                      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                      transition={{
                        delay: 0.5 + wordIndex * 0.1 + letterIndex * 0.025,
                        type: "spring",
                        stiffness: 120,
                        damping: 20,
                      }}
                      className="inline-block text-gray-900 dark:text-zinc-100 transition-colors duration-300"
                    >
                      {letter}
                    </motion.span>
                  ))}
                </span>
              ))}
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="text-lg md:text-xl text-gray-500 dark:text-zinc-400 max-w-2xl mx-auto mb-12 font-light leading-relaxed transition-colors duration-300"
            >
              Fotoğrafınızı yükleyin, 4 köşeyi işaretleyin. Yapay zeka %90'a varan doğruluk payıyla (±10-15 cm){" "}
              <span className="text-gray-900 dark:text-zinc-100 font-medium transition-colors duration-300">duvar boyutlarınızı</span> saniyeler içinde hesaplasın.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <AuthModal redirectUrl="/dashboard/olcum">
                <button
                  className="group inline-flex w-full sm:w-auto items-center justify-center gap-3 px-8 py-4 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black font-semibold text-[15px] transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  Hemen Ölçüm Yap
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </AuthModal>
              <AuthModal redirectUrl="/dashboard/esya-kaldir">
                <button
                  className="group inline-flex w-full sm:w-auto items-center justify-center gap-3 px-8 py-4 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white font-semibold text-[15px] transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  Evinizde Görselleştir
                  <Zap className="w-4 h-4 text-indigo-500 transition-transform duration-300 group-hover:scale-110" />
                </button>
              </AuthModal>
            </motion.div>

            {/* Trust signal */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 1 }}
              className="mt-16 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[13px] font-medium text-gray-500 dark:text-zinc-400 transition-colors duration-300"
            >
              <div className="flex items-center gap-2 border border-gray-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 px-3 py-1.5 rounded-full shadow-sm transition-colors duration-300">
                <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100/50 dark:border-indigo-500/20 transition-colors duration-300">
                  <Zap className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                </div>
                Hızlı ve YZ Destekli
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 hidden sm:block transition-colors duration-300" />
              <div className="flex items-center gap-2 border border-gray-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 px-3 py-1.5 rounded-full shadow-sm transition-colors duration-300">
                <div className="w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center border border-amber-100/50 dark:border-amber-500/20 transition-colors duration-300">
                  <InfinityIcon className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                </div>
                Sınırsız Kredi
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 hidden sm:block transition-colors duration-300" />
              <div className="flex items-center gap-2 border border-gray-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 px-3 py-1.5 rounded-full shadow-sm transition-colors duration-300">
                <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100/50 dark:border-emerald-500/20 transition-colors duration-300">
                  <Target className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                </div>
                %90'a Varan Doğruluk
              </div>
            </motion.div>

            {/* Preview Design Section */}
            <PreviewSteps />
          </motion.div>
        </div>
      </div>
    </>
  );
}
