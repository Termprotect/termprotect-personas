import * as React from "react";
import { cn } from "@/lib/utils";

export type TagVariant = "default" | "neutral" | "good" | "warn" | "bad" | "info";

const VARIANT: Record<TagVariant, string> = {
  default: "bg-line text-ink-2",
  neutral: "bg-line text-ink-2",
  good:    "bg-good/15 text-good",
  warn:    "bg-warn/15 text-warn",
  bad:     "bg-bad/15 text-bad",
  info:    "bg-accent/15 text-accent",
};

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
  dot?: boolean;
}

export function Tag({ variant = "default", dot, className, children, ...props }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px] font-medium tracking-[0.02em] px-[7px] py-[2px] rounded-sm",
        VARIANT[variant],
        className,
      )}
      {...props}
    >
      {dot ? (
        <span aria-hidden className="text-[8px] leading-none">●</span>
      ) : null}
      {children}
    </span>
  );
}
