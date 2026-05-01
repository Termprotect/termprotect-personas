"use client";

import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  StopCircle,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Coffee,
  Clock,
} from "lucide-react";
import { formatMinutes, formatTime, workedMinutes } from "@/lib/time";

type Entry = {
  id: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  breakStartedAt: string | null;
};

type Action = "clock_in" | "break_start" | "break_end" | "clock_out";

export default function FichajeWidget({
  initialEntry,
}: {
  initialEntry: Entry | null;
}) {
  const [entry, setEntry] = useState<Entry | null>(initialEntry);
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  // Reloj en vivo (cada 30s basta para minutos)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const state: "IDLE" | "WORKING" | "ON_BREAK" | "DONE" = !entry
    ? "IDLE"
    : entry.clockOut
      ? "DONE"
      : entry.breakStartedAt
        ? "ON_BREAK"
        : "WORKING";

  const doAction = async (action: Action) => {
    setPending(action);
    setError(null);
    try {
      const res = await fetch("/api/fichaje", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo registrar el fichaje");
      } else {
        setEntry(json.entry);
      }
    } catch {
      setError("Error de red");
    } finally {
      setPending(null);
    }
  };

  const worked = entry
    ? workedMinutes(
        {
          clockIn: entry.clockIn,
          clockOut: entry.clockOut,
          breakMinutes: entry.breakMinutes,
          breakStartedAt: entry.breakStartedAt,
        },
        now
      )
    : 0;

  const breakTotal = entry
    ? entry.breakMinutes +
      (entry.breakStartedAt && !entry.clockOut
        ? Math.max(
            0,
            Math.round(
              (now.getTime() - new Date(entry.breakStartedAt).getTime()) / 60000
            )
          )
        : 0)
    : 0;

  return (
    <div className="bg-background rounded-xl border border-border overflow-hidden">
      <div
        className={`p-6 ${
          state === "WORKING"
            ? "bg-success/10 border-b border-success/20"
            : state === "ON_BREAK"
              ? "bg-warning/10 border-b border-warning/20"
              : state === "DONE"
                ? "bg-secondary border-b border-border"
                : "bg-background"
        }`}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <StateDot state={state} />
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                {stateLabel(state)}
              </p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {new Intl.DateTimeFormat("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(now)}
              </p>
            </div>
          </div>

          {entry && (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <Stat label="Entrada" value={formatTime(new Date(entry.clockIn))} />
              <Stat
                label="Salida"
                value={entry.clockOut ? formatTime(new Date(entry.clockOut)) : "—"}
              />
              <Stat
                label={state === "DONE" ? "Jornada" : "Trabajado"}
                value={formatMinutes(worked)}
                emphasis
              />
            </div>
          )}
        </div>

        {entry && breakTotal > 0 && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <Coffee className="w-3 h-3" />
            Pausa acumulada: {formatMinutes(breakTotal)}
          </p>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="flex items-start gap-2 p-3 mb-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {state === "IDLE" && (
            <ActionButton
              onClick={() => doAction("clock_in")}
              loading={pending === "clock_in"}
              icon={Play}
              label="Fichar entrada"
              variant="primary"
            />
          )}

          {state === "WORKING" && (
            <>
              <ActionButton
                onClick={() => doAction("break_start")}
                loading={pending === "break_start"}
                icon={Pause}
                label="Empezar pausa"
                variant="secondary"
              />
              <ActionButton
                onClick={() => doAction("clock_out")}
                loading={pending === "clock_out"}
                icon={StopCircle}
                label="Fichar salida"
                variant="danger"
              />
            </>
          )}

          {state === "ON_BREAK" && (
            <>
              <ActionButton
                onClick={() => doAction("break_end")}
                loading={pending === "break_end"}
                icon={Play}
                label="Volver al trabajo"
                variant="primary"
              />
              <ActionButton
                onClick={() => doAction("clock_out")}
                loading={pending === "clock_out"}
                icon={StopCircle}
                label="Fichar salida"
                variant="danger"
              />
            </>
          )}

          {state === "DONE" && (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Jornada cerrada. Nos vemos mañana.
            </div>
          )}
        </div>

        {state === "ON_BREAK" && entry?.breakStartedAt && (
          <p className="text-xs text-warning mt-3 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Pausa iniciada a las {formatTime(new Date(entry.breakStartedAt))}
          </p>
        )}
      </div>
    </div>
  );
}

function stateLabel(state: "IDLE" | "WORKING" | "ON_BREAK" | "DONE") {
  return state === "IDLE"
    ? "Sin iniciar"
    : state === "WORKING"
      ? "Trabajando"
      : state === "ON_BREAK"
        ? "En pausa"
        : "Jornada cerrada";
}

function StateDot({ state }: { state: "IDLE" | "WORKING" | "ON_BREAK" | "DONE" }) {
  const color =
    state === "WORKING"
      ? "bg-success"
      : state === "ON_BREAK"
        ? "bg-warning"
        : state === "DONE"
          ? "bg-muted-foreground"
          : "bg-muted";
  const pulse = state === "WORKING" || state === "ON_BREAK";
  return (
    <span className="relative flex w-3 h-3">
      {pulse && (
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-60 animate-ping`}
        />
      )}
      <span className={`relative inline-flex rounded-full w-3 h-3 ${color}`} />
    </span>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </p>
      <p
        className={`tabular-nums ${
          emphasis
            ? "text-lg font-bold text-foreground"
            : "text-sm font-medium text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  onClick,
  loading,
  icon: Icon,
  label,
  variant,
}: {
  onClick: () => void;
  loading: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant: "primary" | "secondary" | "danger";
}) {
  const cls =
    variant === "primary"
      ? "bg-primary hover:bg-primary/90 text-white"
      : variant === "danger"
        ? "bg-destructive hover:bg-destructive/90 text-white"
        : "bg-muted hover:bg-muted text-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 ${cls}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Icon className="w-4 h-4" />
      )}
      {label}
    </button>
  );
}
