"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Info,
} from "lucide-react";
import {
  LEAVE_TYPES,
  LEAVE_TYPE_LABELS,
  CONSUMES_VACATION,
  CONSUMES_PERSONAL,
  REQUIRES_ATTACHMENT,
} from "@/lib/validators/leave-request";

type Balances = Record<
  number,
  { vacationAvailable: number; personalAvailable: number }
>;

const NATURAL_DAYS = new Set<string>([
  "INCAPACIDAD_TEMPORAL",
  "EXCEDENCIA_VOLUNTARIA",
  "EXCEDENCIA_HIJOS",
  "EXCEDENCIA_FAMILIARES",
  "PERMISO_LACTANCIA",
]);

export default function SolicitarForm({
  holidays,
  balances,
}: {
  holidays: string[];
  balances: Balances;
}) {
  const router = useRouter();
  const [type, setType] = useState<(typeof LEAVE_TYPES)[number]>("VACACIONES");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const holidaysSet = useMemo(() => new Set(holidays), [holidays]);

  const todayIso = new Date().toISOString().slice(0, 10);

  // Cálculo de días previsualizados
  const preview = useMemo(() => {
    if (!startDate || !endDate) return null;
    if (endDate < startDate) return null;
    const countNatural = NATURAL_DAYS.has(type);

    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const start = new Date(Date.UTC(sy, sm - 1, sd));
    const end = new Date(Date.UTC(ey, em - 1, ed));

    let count = 0;
    const cur = new Date(start);
    while (cur.getTime() <= end.getTime()) {
      if (countNatural) {
        count++;
      } else {
        const dow = cur.getUTCDay();
        const iso = cur.toISOString().slice(0, 10);
        if (dow !== 0 && dow !== 6 && !holidaysSet.has(iso)) count++;
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return { count, natural: countNatural };
  }, [startDate, endDate, type, holidaysSet]);

  const year = startDate
    ? parseInt(startDate.slice(0, 4), 10)
    : new Date().getUTCFullYear();

  const vacationAvailable = balances[year]?.vacationAvailable ?? null;
  const personalAvailable = balances[year]?.personalAvailable ?? null;

  const consumesVacation = CONSUMES_VACATION.includes(type);
  const consumesPersonal = CONSUMES_PERSONAL.includes(type);
  const needsAttachment = REQUIRES_ATTACHMENT.includes(type);

  // Bloqueo si solicita más de lo disponible (solo preview, backend valida)
  const overBudget =
    preview &&
    ((consumesVacation &&
      vacationAvailable !== null &&
      preview.count > vacationAvailable) ||
      (consumesPersonal &&
        personalAvailable !== null &&
        preview.count > personalAvailable));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (needsAttachment && !file) {
      setError("Este tipo de permiso requiere adjuntar justificante.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("type", type);
      fd.set("startDate", startDate);
      fd.set("endDate", endDate);
      if (notes) fd.set("notes", notes);
      if (file) fd.set("file", file);

      const res = await fetch("/api/leave-requests", {
        method: "POST",
        body: fd,
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "No se pudo enviar la solicitud");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push("/ausencias");
        router.refresh();
      }, 600);
    } catch {
      setError("Error de red");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="bg-background rounded-xl border border-border p-6 space-y-5 max-w-3xl"
    >
      {error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-3 bg-success/10 border border-success/20 rounded-lg text-success text-sm">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Solicitud enviada. Redirigiendo...</span>
        </div>
      )}

      {/* Tipo */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Tipo de ausencia
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          required
        >
          {LEAVE_TYPES.map((t) => (
            <option key={t} value={t}>
              {LEAVE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        {/* Saldos según tipo */}
        {consumesVacation && vacationAvailable !== null && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Saldo de vacaciones disponible en {year}:{" "}
            <strong>{vacationAvailable}</strong> día(s)
          </p>
        )}
        {consumesPersonal && personalAvailable !== null && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Saldo de asuntos propios en {year}:{" "}
            <strong>{personalAvailable}</strong> día(s)
          </p>
        )}
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Fecha inicio
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (endDate && endDate < e.target.value) setEndDate(e.target.value);
            }}
            min={type === "INCAPACIDAD_TEMPORAL" ? undefined : todayIso}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Fecha fin
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || (type === "INCAPACIDAD_TEMPORAL" ? undefined : todayIso)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            required
          />
        </div>
      </div>

      {/* Preview de días */}
      {preview && (
        <div
          className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
            overBudget
              ? "bg-destructive/10 border-destructive/20 text-destructive"
              : "bg-info/10 border-border text-primary"
          }`}
        >
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Días a solicitar: <strong>{preview.count}</strong>{" "}
            {preview.natural
              ? "(días naturales)"
              : "(laborables descontando festivos de tu sede)"}
            {overBudget && " — supera el saldo disponible."}
          </span>
        </div>
      )}

      {/* Notas */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Notas <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Información adicional para tu responsable"
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Adjunto */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Justificante{" "}
          {needsAttachment ? (
            <span className="text-destructive font-semibold">(obligatorio)</span>
          ) : (
            <span className="text-muted-foreground font-normal">(opcional)</span>
          )}
        </label>
        <label className="flex items-center justify-center gap-2 px-3 py-4 border border-dashed border-border rounded-lg text-sm text-muted-foreground cursor-pointer hover:bg-secondary">
          <Paperclip className="w-4 h-4" />
          {file ? (
            <span className="font-medium text-foreground">{file.name}</span>
          ) : (
            <span>Subir archivo (JPG, PNG, WEBP o PDF, máx. 10 MB)</span>
          )}
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => router.push("/ausencias")}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg"
          disabled={submitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting || !startDate || !endDate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg disabled:opacity-60"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Enviar solicitud
        </button>
      </div>
    </form>
  );
}
