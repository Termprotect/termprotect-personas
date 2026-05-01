"use client";

import { Donut, type DonutSlice } from "@/components/ui/donut";

const PALETTE = [
  "var(--accent)",
  "var(--accent-2)",
  "var(--good)",
  "var(--warn)",
  "var(--neutral)",
  "var(--bad)",
  "#7c2db0",
  "#0d8584",
];

interface DistribucionItem {
  id: string;
  label: string;
  value: number;
}

interface DonutDistribucionProps {
  data: DistribucionItem[];
  total?: React.ReactNode;
  totalLabel?: string;
}

export function DonutDistribucion({ data, total, totalLabel }: DonutDistribucionProps) {
  const slices: DonutSlice[] = data.map((d, i) => ({
    id: d.id,
    value: d.value,
    color: PALETTE[i % PALETTE.length],
    label: d.label,
  }));

  const sum = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="flex items-center gap-4">
      <Donut
        data={slices}
        total={total ?? sum}
        totalLabel={totalLabel ?? "TOTAL"}
        size={140}
        thickness={20}
      />
      <ul className="flex-1 flex flex-col gap-2 min-w-0">
        {slices.map((s, i) => {
          const pct = sum > 0 ? Math.round(((data[i]?.value ?? 0) / sum) * 100) : 0;
          return (
            <li key={s.id} className="flex items-center gap-2 text-[12px] min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              <span className="text-ink-2 truncate flex-1">{data[i]?.label ?? s.id}</span>
              <span className="font-mono tabular-nums text-ink">{data[i]?.value}</span>
              <span className="font-mono tabular-nums text-ink-3 w-9 text-right">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
