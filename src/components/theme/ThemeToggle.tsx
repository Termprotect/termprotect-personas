"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div aria-hidden="true" className="w-8 h-8" />;
  }

  const isNight = theme === "night";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isNight ? "Cambiar a modo día" : "Cambiar a modo noche"}
      aria-pressed={isNight}
      title={isNight ? "Modo día" : "Modo noche"}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-line transition-colors"
    >
      {isNight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
