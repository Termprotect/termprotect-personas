import * as React from "react";
import { Kpi } from "@/components/ui/kpi";

export type KpiFormat = "number" | "percent" | "hours" | "score" | "decimal";

interface KpiCardProps {
  title: string;
  value: number | null;
  format?: KpiFormat;
  delta?: number | null;
  deltaLabel?: string;
  deltaInverse?: boolean;
  hint?: string;
  unit?: React.ReactNode;
  sparkData?: number[];
  sparkColor?: string;
  className?: string;
  /** Compat: accepted from older callers but not rendered in the new design. */
  icon?: React.ReactNode;
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
      return DECIMAL_FMT.format(value);
    case "hours":
      return DECIMAL_FMT.format(value);
    case "score":
    case "decimal":
      return DECIMAL_FMT.format(value);
    case "number":
    default:
      return NUMBER_FMT.format(Math.round(value));
  }
}

function defaultUnit(format: KpiFormat): React.ReactNode | undefined {
  switch (format) {
    case "percent":
      return "%";
    case "hours":
      return "h";
    case "score":
      return "/5";
    default:
      return undefined;
  }
}

export function KpiCard({
  title,
  value,
  format = "number",
  delta,
  deltaLabel,
  deltaInverse,
  hint,
  unit,
  sparkData,
  sparkColor,
  className,
  icon: _icon, // accepted for legacy compat (workforce-tab, alerts-tab); intentionally not rendered
}: KpiCardProps) {
  void _icon;
  return (
    <Kpi
      label={title}
      value={formatValue(value, format)}
      unit={unit ?? defaultUnit(format)}
      delta={typeof delta === "number" ? delta : null}
      deltaLabel={deltaLabel}
      deltaInverse={deltaInverse}
      foot={hint}
      sparkData={sparkData}
      sparkColor={sparkColor}
      className={className}
    />
  );
}
