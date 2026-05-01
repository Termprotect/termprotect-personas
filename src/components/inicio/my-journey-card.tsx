"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";

interface Snapshot {
  clockInAt: string | null;
  clockOutAt: string | null;
  workedMinutes: number;
  pauseMinutes: number;
  expectedMinutes: number;
  status: "TRABAJANDO" | "EN_PAUSA" | "FINALIZADA" | "SIN_FICHAR";
  sedeName: string | null;
}

function fmtHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.max(0, Math.floor(mins % 60));
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function fmtClock(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_TAG: Record<
  Snapshot["status"],
  { variant: "good" | "warn" | "bad" | "neutral"; label: string }
> = {
  TRABAJANDO: { variant: "good", label: "EN CURSO" },
  EN_PAUSA: { variant: "warn", label: "EN PAUSA" },
  FINALIZADA: { variant: "neutral", label: "FINALIZADA" },
  SIN_FICHAR: { variant: "bad", label: "SIN FICHAR" },
};

export function MyJourneyCard() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchSnap() {
      try {
        const res = await fetch("/api/jornada/me/today", { cache: "no-store" });
        if (!res.ok) throw new Error("non-ok");
        const json = await res.json();
        if (!cancelled) {
          setSnap(json.data);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }
    fetchSnap();
    timerRef.current = setInterval(fetchSnap, 30_000);
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (error && !snap) {
    return (
      <Card className="p-5">
        <div className="text-[12px] text-bad font-mono">No se pudo cargar tu jornada.</div>
      </Card>
    );
  }

  if (!snap) {
    return (
      <Card className="p-5 min-h-[160px] flex items-center justify-center">
        <div className="text-[11px] font-mono uppercase tracking-[0.04em] text-ink-3">
          Cargando jornada…
        </div>
      </Card>
    );
  }

  const tagInfo = STATUS_TAG[snap.status];
  const progressPct = Math.min(
    100,
    Math.round((snap.workedMinutes / snap.expectedMinutes) * 100),
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline gap-2">
          <CardTitle>Mi jornada</CardTitle>
          <Tag variant={tagInfo.variant} dot>
            {tagInfo.label}
          </Tag>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="font-mono text-[36px] font-medium leading-none tabular-nums tracking-[-0.02em] text-ink">
          {fmtHHMM(snap.workedMinutes)}
        </div>
        <div className="text-[10.5px] font-mono uppercase tracking-[0.04em] text-ink-3">
          desde {fmtClock(snap.clockInAt)}
          {snap.sedeName ? ` · ${snap.sedeName}` : ""}
        </div>
        <div className="h-1.5 rounded-full bg-line overflow-hidden" aria-hidden>
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="text-[10.5px] font-mono text-ink-3 tabular-nums">
          {progressPct}% de {fmtHHMM(snap.expectedMinutes)} previstas
        </div>
        <Button
          variant="primary"
          className="w-full"
          disabled={snap.status === "SIN_FICHAR"}
        >
          {snap.status === "TRABAJANDO"
            ? "Iniciar pausa"
            : snap.status === "EN_PAUSA"
              ? "Reanudar"
              : "Fichar entrada"}
        </Button>
      </CardContent>
    </Card>
  );
}
