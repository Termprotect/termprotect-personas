import * as React from "react";
import { cn } from "@/lib/utils";

const GRADIENTS: Array<[string, string]> = [
  ["#2b4cdb", "#5b7be8"],
  ["#d96a2a", "#f08c4f"],
  ["#2f7a3a", "#4ea05c"],
  ["#c97a14", "#e09a3a"],
  ["#5b6b7d", "#8aa0b5"],
  ["#7c2db0", "#aa5fd6"],
  ["#0d8584", "#2eb6b5"],
  ["#b8331c", "#dc6149"],
];

const SIZE: Record<"sm" | "md" | "lg" | "xl", { wh: string; text: string }> = {
  sm: { wh: "w-[18px] h-[18px]", text: "text-[8.5px]" },
  md: { wh: "w-[22px] h-[22px]", text: "text-[9.5px]" },
  lg: { wh: "w-[28px] h-[28px]", text: "text-[11px]" },
  xl: { wh: "w-[40px] h-[40px]", text: "text-[14px]" },
};

interface AvatarProps {
  name: string;
  size?: keyof typeof SIZE;
  className?: string;
  src?: string;
}

function pickGradient(name: string): [string, string] {
  const code = name && name.length > 0 ? name.charCodeAt(0) : 0;
  return GRADIENTS[Math.abs(code) % GRADIENTS.length];
}

function getInitials(name: string): string {
  if (!name) return "·";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ name, size = "md", className, src }: AvatarProps) {
  const [c1, c2] = pickGradient(name);
  const initials = getInitials(name);
  const s = SIZE[size];

  if (src) {
    return (
      <span
        className={cn("inline-block rounded-full overflow-hidden bg-line-2", s.wh, className)}
        aria-hidden
      >
        <img src={src} alt="" className="w-full h-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium tracking-tight select-none text-white dark:text-[#0a0e1a]",
        s.wh,
        s.text,
        className,
      )}
      style={{ backgroundImage: `linear-gradient(135deg, ${c1}, ${c2})` }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
