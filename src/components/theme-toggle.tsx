"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all text-gray-500 dark:text-zinc-400 group relative overflow-hidden focus:outline-none"
      title={theme === "dark" ? "Açık Mod" : "Koyu Mod"}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <Sun className={`absolute w-5 h-5 transition-all duration-500 transform ${theme === "dark" ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100 text-amber-500"}`} />
        <Moon className={`absolute w-5 h-5 transition-all duration-500 transform ${theme === "dark" ? "opacity-100 rotate-0 scale-100 text-indigo-400" : "opacity-0 -rotate-90 scale-50"}`} />
      </div>
    </button>
  );
}
