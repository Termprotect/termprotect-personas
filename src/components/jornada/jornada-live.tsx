"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface InitialSnapshot {
  clockInAt: string | null;
  workedMinutes: number;
  expectedMinutes: number;
  status: "TRABAJANDO" | "EN_PAUSA" | "FINALIZADA" | "SIN_FICHAR";
}

interface JornadaLiveProps {
  initial: InitialSnapshot;
}

function fmtClock(d: Date): string {
  return d.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function fmtHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.max(0, Math.floor(mins % 60));
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function JornadaLive({ initial }: JornadaLiveProps) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  let liveWorked = initial.workedMinutes;
  if (initial.status === "TRABAJANDO" && initial.clockInAt) {
    const baseClockIn = new Date(initial.clockInAt);
    const since = Math.floor((now.getTime() - baseClockIn.getTime()) / 60_000);
    liveWorked = Math.max(initial.workedMinutes, since);
  }

  const progress = Math.min(1, liveWorked / Math.max(1, initial.expectedMinutes));
  const pct = Math.round(progress * 100);

  const r = 70;
  const C = 2 * Math.PI * r;
  const dashOffset = C * (1 - progress);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-6 items-center">
      <div className="flex flex-col gap-3">
        <div className="font-mono text-[88px] leading-none font-light tabular-nums tracking-[-0.03em] text-ink">
          {fmtClock(now)}
        </div>
        <div className="text-[11px] font-mono uppercase tracking-[0.04em] text-ink-3">
          {initial.status === "TRABAJANDO"
            ? `trabajadas: ${fmtHHMM(liveWorked)} · objetivo ${fmtHHMM(initial.expectedMinutes)}`
            : initial.status === "FINALIZADA"
              ? `jornada finalizada · ${fmtHHMM(liveWorked)} hoy`
              : initial.status === "EN_PAUSA"
                ? `en pausa · ${fmtHHMM(liveWorked)} acumuladas`
                : "sin fichar — pulsa para empezar"}
        </div>
        <div className="flex gap-2 mt-2">
          <Button variant="primary" size="md" disabled={initial.status === "FINALIZADA"}>
            {initial.status === "TRABAJANDO"
              ? "Iniciar pausa"
              : initial.status === "EN_PAUSA"
                ? "Reanudar"
                : initial.status === "SIN_FICHAR"
                  ? "Fichar entrada"
                  : "Reabrir"}
          </Button>
          {initial.status === "TRABAJANDO" || initial.status === "EN_PAUSA" ? (
            <Button variant="default" size="md">
              Salida
            </Button>
          ) : null}
        </div>
      </div>

      <div className="relative w-[160px] h-[160px] mx-auto">
        <svg width={160} height={160} viewBox="0 0 160 160" aria-hidden>
          <circle cx={80} cy={80} r={r} fill="none" stroke="var(--line)" strokeWidth={14} />
          <circle
            cx={80}
            cy={80}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 80 80)"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="font-mono text-[22px] font-medium tabular-nums leading-none text-ink">
            {pct}%
          </div>
          <div className="text-[9px] font-mono uppercase tracking-[0.08em] text-ink-3 mt-1">
            JORNADA
          </div>
        </div>
      </div>
    </div>
  );
}
