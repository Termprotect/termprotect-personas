import * as React from "react";
import { MiniKpi } from "@/components/ui/mini-kpi";

interface MiniCardProps {
  label: string;
  value: string | number | null;
  hint?: string;
  meta?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

const NUMBER_FMT = new Intl.NumberFormat("es-ES");

export function MiniCard({ label, value, hint, meta, className, valueClassName }: MiniCardProps) {
  let display: React.ReactNode;
  if (value === null || value === undefined) display = "—";
  else if (typeof value === "number") display = NUMBER_FMT.format(value);
  else display = value;

  return (
    <MiniKpi
      label={label}
      value={display}
      meta={meta ?? hint}
      className={className}
      valueClassName={valueClassName}
    />
  );
}
