"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";

interface LeavesStatusProps {
  data: { status: string; count: number }[];
  height?: number;
}

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendientes",
  APROBADA: "Aprobadas",
  RECHAZADA: "Rechazadas",
  CANCELADA: "Canceladas",
};

const STATUS_COLORS: Record<string, string> = {
  PENDIENTE: "#F59E0B",
  APROBADA: "#10B981",
  RECHAZADA: "#DC2626",
  CANCELADA: "#94a3b8",
};

export function LeavesStatusChart({ data, height = 240 }: LeavesStatusProps) {
  const enriched = data.map((d) => ({
    label: STATUS_LABELS[d.status] ?? d.status,
    count: d.count,
    color: STATUS_COLORS[d.status] ?? "#1C1917",
  }));
  const hasData = enriched.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <EmptyState
        compact
        icon={<BarChart3 className="w-5 h-5" />}
        title="Sin solicitudes"
        description="No hay solicitudes en el periodo seleccionado."
      />
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={enriched} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
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
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
            formatter={(value) => [Number(value ?? 0), "Solicitudes"] as [number, string]}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {enriched.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
