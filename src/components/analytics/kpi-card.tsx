import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export type KpiFormat = "number" | "percent" | "hours" | "score" | "decimal";

interface KpiCardProps {
  title: string;
  value: number | null;
  format?: KpiFormat;
  delta?: number | null;
  deltaLabel?: string;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
}

const NUMBER_FMT = new Intl.NumberFormat("es-ES");
const DECIMAL_FMT = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatValue(value: number | null, format: KpiFormat): string {
  if (value === null || !Number.isFinite(value)) return "—";
  switch (format) {
    case "percent":
      return `${DECIMAL_FMT.format(value)}%`;
    case "hours":
      return `${DECIMAL_FMT.format(value)} h`;
    case "score":
      return DECIMAL_FMT.format(value);
    case "decimal":
      return DECIMAL_FMT.format(value);
    case "number":
    default:
      return NUMBER_FMT.format(Math.round(value));
  }
}

export function KpiCard({
  title,
  value,
  format = "number",
  delta,
  deltaLabel,
  hint,
  icon,
  className,
}: KpiCardProps) {
  const formatted = formatValue(value, format);
  const showDelta = delta !== undefined && delta !== null && Number.isFinite(delta);
  const positive = showDelta && (delta as number) > 0;
  const negative = showDelta && (delta as number) < 0;

  return (
    <Card className={cn("flex flex-col p-5 gap-3", className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {title}
        </p>
        {icon ? <div className="text-slate-400">{icon}</div> : null}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-3xl font-semibold text-slate-900 leading-none">
          {formatted}
        </p>
        {showDelta ? (
          <div className="flex items-center gap-1 text-xs">
            {positive ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            ) : negative ? (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
            ) : null}
            <span
              className={cn(
                "font-medium",
                positive ? "text-emerald-700" : negative ? "text-rose-700" : "text-slate-500",
              )}
            >
              {(delta as number) > 0 ? "+" : ""}
              {NUMBER_FMT.format(delta as number)}
            </span>
            {deltaLabel ? (
              <span className="text-slate-500">· {deltaLabel}</span>
            ) : null}
          </div>
        ) : hint ? (
          <p className="text-xs text-slate-500">{hint}</p>
        ) : null}
      </div>
    </Card>
  );
}
