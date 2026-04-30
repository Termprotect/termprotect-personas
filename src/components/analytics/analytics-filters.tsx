"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  ANALYTICS_PERIODS,
  ANALYTICS_PERIOD_LABELS,
  type AnalyticsPeriod,
} from "@/lib/validators/analytics";

interface AnalyticsFiltersProps {
  sedes: { id: string; name: string }[];
  current: { period: AnalyticsPeriod; sedeId?: string; tab: string };
  showSedeSelector?: boolean;
}

export function AnalyticsFilters({
  sedes,
  current,
  showSedeSelector = true,
}: AnalyticsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const updateParam = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value.length > 0) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="period" className="text-xs font-medium text-slate-500">
          Periodo
        </label>
        <select
          id="period"
          value={current.period}
          onChange={(e) => updateParam("period", e.target.value)}
          disabled={isPending}
          className="text-sm rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          {ANALYTICS_PERIODS.map((p) => (
            <option key={p} value={p}>
              {ANALYTICS_PERIOD_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      {showSedeSelector ? (
        <div className="flex items-center gap-2">
          <label htmlFor="sedeId" className="text-xs font-medium text-slate-500">
            Sede
          </label>
          <select
            id="sedeId"
            value={current.sedeId ?? ""}
            onChange={(e) => updateParam("sedeId", e.target.value || undefined)}
            disabled={isPending}
            className="text-sm rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Todas las sedes</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {isPending ? (
        <span className="text-xs text-slate-400 ml-auto">Actualizando...</span>
      ) : null}
    </div>
  );
}
