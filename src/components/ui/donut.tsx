"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export interface DonutSlice {
  id: string;
  value: number;
  color: string;
  label?: string;
}

interface DonutProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  total?: React.ReactNode;
  totalLabel?: string;
  className?: string;
}

export function Donut({
  data,
  size = 160,
  thickness = 22,
  total,
  totalLabel,
  className,
}: DonutProps) {
  const outer = size / 2;
  const inner = outer - thickness;

  return (
    <div
      className={cn("relative inline-block", className)}
      style={{ width: size, height: size }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="id"
            innerRadius={inner}
            outerRadius={outer}
            paddingAngle={1}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((s) => (
              <Cell key={s.id} fill={s.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {total !== undefined ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="font-mono text-[28px] font-medium tabular-nums leading-none text-ink">
            {total}
          </div>
          {totalLabel ? (
            <div className="text-[9.5px] uppercase tracking-[0.06em] text-ink-3 mt-1">
              {totalLabel}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
