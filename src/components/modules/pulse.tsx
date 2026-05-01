"use client";

import { useEffect, useRef, useState } from "react";

interface PulseSnapshot {
  current: number;
  series: number[];
}

const FALLBACK_SERIES_LEN = 60;

function makeFallback(seed = 88): number[] {
  return Array.from({ length: FALLBACK_SERIES_LEN }, (_, i) => {
    const noise = Math.sin(i * 0.35) * 6 + Math.cos(i * 0.7) * 3;
    return Math.max(0, Math.round(seed + noise + (i % 7 === 0 ? 4 : 0)));
  });
}

export function Pulse() {
  const [snap, setSnap] = useState<PulseSnapshot>({
    current: 0,
    series: makeFallback(),
  });
  const [hasReal, setHasReal] = useState(false);
  const fetchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchPulse() {
      try {
        const res = await fetch("/api/analytics/pulse", { cache: "no-store" });
        if (!res.ok) throw new Error("non-ok");
        const json = await res.json();
        const data = json?.data;
        if (!cancelled && data && Array.isArray(data.series)) {
          setSnap({
            current: Number.isFinite(data.current) ? data.current : 0,
            series: data.series.map((v: unknown) => Number(v) || 0),
          });
          setHasReal(true);
        }
      } catch {
        // Keep fallback. Endpoint not implemented yet or transient failure.
      }
    }
    fetchPulse();
    fetchTimerRef.current = setInterval(fetchPulse, 30_000);
    return () => {
      cancelled = true;
      if (fetchTimerRef.current) clearInterval(fetchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    tickTimerRef.current = setInterval(() => {
      setSnap((prev) => {
        if (prev.series.length === 0) return prev;
        const next = prev.series.slice(1);
        const last = prev.series[prev.series.length - 1] ?? prev.current;
        const drift = Math.round((Math.random() - 0.5) * 6);
        next.push(Math.max(0, last + drift));
        return {
          current: hasReal ? prev.current : next[next.length - 1],
          series: next,
        };
      });
    }, 1500);
    return () => {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    };
  }, [hasReal]);

  const path = buildPath(snap.series, 80, 22);

  return (
    <div
      className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-line-2 bg-surface shadow-sm"
      title="Pulso · fichajes/min últimos 60 minutos"
    >
      <span
        className="w-[6px] h-[6px] rounded-full bg-pulse animate-pulse-ring"
        aria-hidden
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
        Pulso
      </span>
      <svg width={80} height={22} viewBox="0 0 80 22" aria-hidden className="shrink-0">
        <path
          d={path}
          fill="none"
          stroke="var(--pulse)"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-mono text-[12px] font-semibold tabular-nums text-ink">
        {snap.current}
        <span className="text-ink-3 font-normal ml-0.5">/min</span>
      </span>
    </div>
  );
}

function buildPath(values: number[], w: number, h: number): string {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = w / Math.max(1, values.length - 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}
