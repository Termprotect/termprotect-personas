"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Theme = "day" | "night";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const COOKIE_KEY = "tp_theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function persistCookie(value: Theme) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function applyAttribute(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

interface ThemeProviderProps {
  initial: Theme;
  children: React.ReactNode;
}

export function ThemeProvider({ initial, children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(initial);

  useEffect(() => {
    applyAttribute(theme);
    persistCookie(theme);
  }, [theme]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        setThemeState((t) => (t === "day" ? "night" : "day"));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((t) => (t === "day" ? "night" : "day"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

export const themeInitScript = `
  (function () {
    try {
      var match = document.cookie.match(/(?:^|; )tp_theme=([^;]+)/);
      var theme = match ? decodeURIComponent(match[1]) : 'day';
      if (theme !== 'day' && theme !== 'night') theme = 'day';
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {}
  })();
`;
