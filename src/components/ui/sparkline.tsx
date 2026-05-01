"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = "var(--accent)", height = 38 }: SparklineProps) {
  const reactId = useId();
  const id = `spark-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;

  if (!data || data.length === 0) {
    return <div style={{ height }} aria-hidden />;
  }

  const series = data.map((v, i) => ({ i, v }));

  return (
    <div style={{ width: "100%", height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.4}
            fill={`url(#${id})`}
            isAnimationActive={false}
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
