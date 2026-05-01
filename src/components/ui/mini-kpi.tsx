import * as React from "react";
import { cn } from "@/lib/utils";

interface MiniKpiProps {
  label: string;
  value: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

export function MiniKpi({ label, value, meta, className, valueClassName }: MiniKpiProps) {
  return (
    <div className={cn("flex flex-col gap-1 px-[14px] py-[12px] min-w-0", className)}>
      <div className="text-[10.5px] uppercase tracking-[0.04em] text-ink-3 font-medium truncate">
        {label}
      </div>
      <div
        className={cn(
          "font-mono text-[22px] font-medium leading-none tracking-[-0.02em] tabular-nums",
          valueClassName,
        )}
      >
        {value}
      </div>
      {meta ? (
        <div className="text-[10.5px] font-mono text-ink-3">{meta}</div>
      ) : null}
    </div>
  );
}

export function MiniKpiStrip({
  children,
  className,
  cols,
}: {
  children: React.ReactNode;
  className?: string;
  cols?: number;
}) {
  const colsClass =
    cols === 2 ? "grid-cols-2"
    : cols === 3 ? "grid-cols-3"
    : cols === 4 ? "grid-cols-4"
    : cols === 5 ? "grid-cols-5"
    : cols === 6 ? "grid-cols-6"
    : "grid-cols-1";
  return (
    <div className={cn("grid divide-x divide-line", colsClass, className)}>
      {children}
    </div>
  );
}
