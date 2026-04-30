"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { PieChart as PieIcon } from "lucide-react";

interface SedeDistributionProps {
  data: { sedeName: string; count: number }[];
  height?: number;
}

const COLORS = ["#2563eb", "#0891b2", "#7c3aed", "#f59e0b", "#10b981", "#ec4899"];

export function SedeDistributionChart({ data, height = 240 }: SedeDistributionProps) {
  const total = data.reduce((acc, d) => acc + d.count, 0);
  if (total === 0) {
    return (
      <EmptyState
        compact
        icon={<PieIcon className="w-5 h-5" />}
        title="Sin datos por sede"
        description="No hay empleados activos para mostrar."
      />
    );
  }

  const enriched = data.map((d) => ({ ...d, percent: total > 0 ? (d.count / total) * 100 : 0 }));

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center">
      <div style={{ width: "100%", height, maxWidth: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={enriched}
              dataKey="count"
              nameKey="sedeName"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={2}
              stroke="#fff"
            >
              {enriched.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 12,
              }}
              formatter={(value) => [Number(value ?? 0), "Empleados"] as [number, string]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 grid grid-cols-1 gap-2 text-sm">
        {enriched.map((d, i) => (
          <li key={d.sedeName} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="text-slate-700 truncate">{d.sedeName}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-semibold text-slate-900">{d.count}</span>
              <span className="text-xs text-slate-500">{d.percent.toFixed(0)}%</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
