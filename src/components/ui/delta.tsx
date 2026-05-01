import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeltaProps {
  value: number;
  label?: string;
  inverse?: boolean;
  format?: (value: number) => string;
  className?: string;
}

function defaultFormat(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

export function Delta({ value, label, inverse = false, format, className }: DeltaProps) {
  const safe = Number.isFinite(value) ? value : 0;
  const kind: "up" | "down" | "neutral" = safe > 0 ? "up" : safe < 0 ? "down" : "neutral";
  const isGood = (kind === "up" && !inverse) || (kind === "down" && inverse);
  const isBad = kind !== "neutral" && !isGood;

  const colorClass = isGood ? "text-good" : isBad ? "text-bad" : "text-ink-3";
  const Icon = kind === "up" ? ArrowUpRight : kind === "down" ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[11px] font-medium tabular-nums",
        colorClass,
        className,
      )}
    >
      <Icon className="w-[11px] h-[11px]" aria-hidden />
      {(format ?? defaultFormat)(safe)}
      {label ? <span className="text-ink-3 ml-1 normal-case">{label}</span> : null}
    </span>
  );
}
