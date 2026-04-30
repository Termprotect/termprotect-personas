"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { LineChart as LineIcon } from "lucide-react";

interface HeadcountTrendProps {
  data: { month: string; count: number }[];
  height?: number;
}

export function HeadcountTrendChart({ data, height = 240 }: HeadcountTrendProps) {
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) {
    return (
      <EmptyState
        compact
        icon={<LineIcon className="w-5 h-5" />}
        title="Sin datos de plantilla"
        description="Aún no hay histórico de empleados para este filtro."
      />
    );
  }
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
            labelStyle={{ color: "#0f172a", fontWeight: 600 }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#1C1917"
            strokeWidth={2}
            dot={{ r: 3, fill: "#1C1917", stroke: "#fff", strokeWidth: 1 }}
            activeDot={{ r: 5 }}
            name="Plantilla activa"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
