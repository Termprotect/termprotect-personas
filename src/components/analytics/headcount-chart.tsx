"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface HeadcountChartProps {
  data: { month: string; count: number }[];
  height?: number;
}

export function HeadcountChart({ data, height = 220 }: HeadcountChartProps) {
  const reactId = useId();
  const id = `hc-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-ink-3 text-[11px] font-mono uppercase tracking-[0.04em]"
        style={{ height }}
      >
        Sin datos
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--grid)" strokeDasharray="2 2" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--ink-3)", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "var(--line-2)" }}
          />
          <YAxis
            tick={{ fill: "var(--ink-3)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={28}
          />
          <Tooltip
            cursor={{ stroke: "var(--line-2)" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--line-2)",
              background: "var(--surface)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--ink)",
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--accent)"
            strokeWidth={1.6}
            fill={`url(#${id})`}
            isAnimationActive={false}
            dot={{ r: 2.5, fill: "var(--surface)", stroke: "var(--accent)", strokeWidth: 1.5 }}
            activeDot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
