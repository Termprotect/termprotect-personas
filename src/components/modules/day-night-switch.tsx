"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

const W = 116;
const H = 36;
const THUMB = 30;
const PADDING = 3;
const TRAVEL = W - THUMB - PADDING * 2;

const DAY_BG =
  "linear-gradient(90deg, #ffd07a 0%, #fff1c5 50%, #b9d6ff 100%)";
const NIGHT_BG =
  "linear-gradient(90deg, #1a2350 0%, #2a1838 50%, #07091a 100%)";

const SUN_GRADIENT =
  "radial-gradient(circle at 35% 30%, #fff5cc 0%, #ffc94e 60%, #f29400 100%)";
const SUN_GLOW = "0 0 14px #ffb85488, 0 0 30px #ffd07a44";

const MOON_GRADIENT =
  "radial-gradient(circle at 65% 40%, #f1ecdc 0%, #c8c2af 60%, #898474 100%)";

export function DayNightSwitch() {
  const { theme, toggle } = useTheme();
  const isNight = theme === "night";

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isNight}
      aria-label="Cambiar modo día/noche (atajo: D)"
      title="Día / Noche  ·  D"
      className="relative shrink-0 cursor-pointer overflow-hidden rounded-full border border-line-3 select-none"
      style={{
        width: W,
        height: H,
        background: isNight ? NIGHT_BG : DAY_BG,
        transition: "background 0.5s ease",
      }}
    >
      {/* Clouds layer (visible in day) */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: isNight ? 0 : 1, transition: "opacity 0.4s ease" }}
        aria-hidden
      >
        <ellipse cx="68" cy="11" rx="9" ry="3.5" fill="#ffffff" opacity="0.7" />
        <ellipse cx="92" cy="22" rx="10" ry="3.5" fill="#ffffff" opacity="0.55" />
        <ellipse cx="80" cy="29" rx="6" ry="2.5" fill="#ffffff" opacity="0.45" />
      </svg>

      {/* Stars layer (visible in night) */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: isNight ? 1 : 0, transition: "opacity 0.6s ease" }}
        aria-hidden
      >
        <circle cx="48" cy="9" r="0.8" fill="#fff" opacity="0.85" />
        <circle cx="60" cy="22" r="0.6" fill="#fff" opacity="0.55" />
        <circle cx="68" cy="13" r="1" fill="#fff" opacity="0.9" />
        <circle cx="80" cy="26" r="0.7" fill="#fff" opacity="0.6" />
        <circle cx="88" cy="9" r="0.5" fill="#fff" opacity="0.5" />
        <circle cx="98" cy="20" r="0.9" fill="#fff" opacity="0.8" />
        <circle cx="55" cy="28" r="0.5" fill="#fff" opacity="0.5" />
        <path d="M40 18 L41 16 L42 18 L41 20 Z" fill="#fff" opacity="0.9" />
      </svg>

      {/* Thumb (sun / moon) */}
      <span
        aria-hidden
        className="absolute rounded-full"
        style={{
          width: THUMB,
          height: THUMB,
          top: PADDING,
          left: PADDING,
          transform: `translateX(${isNight ? TRAVEL : 0}px)`,
          background: isNight ? MOON_GRADIENT : SUN_GRADIENT,
          boxShadow: isNight ? "0 0 8px #ffffff22" : SUN_GLOW,
          transition:
            "transform 0.55s cubic-bezier(0.5, 1.5, 0.6, 1), background 0.4s ease, box-shadow 0.4s ease",
        }}
      >
        {isNight ? (
          <>
            <span
              className="absolute rounded-full bg-[#5a5446] opacity-50"
              style={{ width: 5, height: 5, top: 8, left: 9 }}
            />
            <span
              className="absolute rounded-full bg-[#5a5446] opacity-40"
              style={{ width: 3, height: 3, top: 18, left: 17 }}
            />
            <span
              className="absolute rounded-full bg-[#5a5446] opacity-35"
              style={{ width: 2, height: 2, top: 12, left: 20 }}
            />
          </>
        ) : null}
      </span>
    </button>
  );
}
