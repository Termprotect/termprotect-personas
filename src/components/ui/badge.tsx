import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Compat-style Badge — kept for legacy callers. New code should prefer <Tag>
 * from "./tag" which matches the handoff spec exactly. Variants here map
 * onto the new token set.
 */

export type BadgeVariant = "neutral" | "info" | "success" | "warning" | "danger";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-line text-ink-2",
  info: "bg-accent/15 text-accent",
  success: "bg-good/15 text-good",
  warning: "bg-warn/15 text-warn",
  danger: "bg-bad/15 text-bad",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
