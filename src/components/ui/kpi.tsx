import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./card";
import { Delta } from "./delta";
import { Sparkline } from "./sparkline";

interface KpiProps {
  label: string;
  value: React.ReactNode;
  unit?: React.ReactNode;
  delta?: number | null;
  deltaLabel?: string;
  deltaInverse?: boolean;
  foot?: React.ReactNode;
  sparkData?: number[];
  sparkColor?: string;
  className?: string;
}

export function Kpi({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  deltaInverse,
  foot,
  sparkData,
  sparkColor = "var(--accent)",
  className,
}: KpiProps) {
  const hasSpark = sparkData && sparkData.length > 0;
  return (
    <Card
      className={cn(
        "relative overflow-hidden flex flex-col gap-2 min-h-[140px]",
        className,
      )}
      style={{ padding: "var(--pad-card)" }}
    >
      <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3 font-medium">
        {label}
      </div>
      <div
        className="font-mono leading-none font-medium tracking-[-0.03em] tabular-nums text-ink"
        style={{ fontSize: "var(--kpi)" }}
      >
        {value}
        {unit ? (
          <span className="text-ink-3 ml-1" style={{ fontSize: "0.35em" }}>
            {unit}
          </span>
        ) : null}
      </div>
      {typeof delta === "number" ? (
        <Delta value={delta} label={deltaLabel} inverse={deltaInverse} />
      ) : null}
      {foot ? (
        <div className="text-[11px] text-ink-3 font-mono mt-auto">{foot}</div>
      ) : null}
      {hasSpark ? (
        <div className="absolute left-0 right-0 bottom-0 opacity-85 pointer-events-none">
          <Sparkline data={sparkData!} color={sparkColor} height={38} />
        </div>
      ) : null}
    </Card>
  );
}
