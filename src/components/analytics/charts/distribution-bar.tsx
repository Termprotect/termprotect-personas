"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";

interface DistributionBarProps {
  data: { label: string; count: number }[];
  height?: number;
  layout?: "horizontal" | "vertical";
  color?: string;
  emptyTitle?: string;
}

export function DistributionBarChart({
  data,
  height = 240,
  layout = "horizontal",
  color = "#2563eb",
  emptyTitle = "Sin datos",
}: DistributionBarProps) {
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) {
    return (
      <EmptyState
        compact
        icon={<BarChart3 className="w-5 h-5" />}
        title={emptyTitle}
        description="No hay registros para el filtro seleccionado."
      />
    );
  }

  const isVertical = layout === "vertical";

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={isVertical ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 12, left: isVertical ? 80 : 0, bottom: 0 }}
        >
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={isVertical} horizontal={!isVertical} />
          {isVertical ? (
            <>
              <XAxis
                type="number"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: "#475569", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                width={120}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="label"
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
            </>
          )}
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
            formatter={(value) => [Number(value ?? 0), "Total"] as [number, string]}
          />
          <Bar dataKey="count" fill={color} radius={[6, 6, 6, 6]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
