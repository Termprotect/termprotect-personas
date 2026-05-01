"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface MonthPoint {
  label: string;
  cumulative: number;
  target: number;
  isCurrent?: boolean;
}

interface VacacionesGaugeProps {
  months: MonthPoint[];
  consumedPct: number;
  deltaVsPlan: number;
  height?: number;
}

export function VacacionesGauge({
  months,
  consumedPct,
  deltaVsPlan,
  height = 220,
}: VacacionesGaugeProps) {
  const isAhead = deltaVsPlan > 0;
  const deltaColor = isAhead ? "text-warn" : "text-good";

  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-baseline gap-3">
        <div className="font-mono text-[36px] font-medium leading-none tabular-nums text-ink tracking-[-0.02em]">
          {consumedPct.toFixed(0)}
          <span className="text-ink-3 text-[16px] ml-0.5">%</span>
        </div>
        <div className={`font-mono text-[11px] tabular-nums ${deltaColor}`}>
          {deltaVsPlan > 0 ? "+" : ""}
          {deltaVsPlan.toFixed(1)} pts vs plan
        </div>
      </div>
      <div className="text-[10px] font-mono uppercase tracking-[0.04em] text-ink-3">
        Consumo acumulado · target lineal
      </div>

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={months} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--grid)" strokeDasharray="2 2" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--ink-3)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "var(--line-2)" }}
            />
            <YAxis
              tick={{ fill: "var(--ink-3)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={30}
              unit="%"
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
            <Line
              type="monotone"
              dataKey="target"
              stroke="var(--ink-3)"
              strokeWidth={1}
              strokeDasharray="3 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="var(--accent-2)"
              strokeWidth={1.8}
              isAnimationActive={false}
              dot={(props) => {
                const { cx, cy, index, payload } = props as {
                  cx: number;
                  cy: number;
                  index: number;
                  payload: MonthPoint;
                };
                const r = payload.isCurrent ? 4 : 2;
                return (
                  <circle
                    key={`dot-${index}`}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="var(--surface)"
                    stroke="var(--accent-2)"
                    strokeWidth={1.5}
                  />
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
