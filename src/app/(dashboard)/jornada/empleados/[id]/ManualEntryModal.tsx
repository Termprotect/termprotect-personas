"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, AlertCircle } from "lucide-react";

type InitialValues = {
  date: string; // YYYY-MM-DD
  clockIn?: string; // HH:MM
  clockOut?: string | null; // HH:MM
  breakMinutes?: number;
  notes?: string | null;
  isEdit: boolean;
};

export default function ManualEntryModal({
  open,
  onClose,
  employeeId,
  initialValues,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  initialValues: InitialValues | null;
}) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [clockIn, setClockIn] = useState("09:00");
  const [clockOut, setClockOut] = useState("18:00");
  const [breakMinutes, setBreakMinutes] = useState("60");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (open && initialValues) {
      setDate(initialValues.date);
      setClockIn(initialValues.clockIn ?? "09:00");
      setClockOut(initialValues.clockOut ?? "");
      setBreakMinutes(String(initialValues.breakMinutes ?? 60));
      setNotes(initialValues.notes ?? "");
      setReason("");
      setError(null);
      setFieldErrors({});
    }
  }, [open, initialValues]);

  if (!open || !initialValues) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await fetch("/api/time-entries/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          date,
          clockIn,
          clockOut: clockOut || undefined,
          breakMinutes: Number(breakMinutes) || 0,
          reason,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.details?.fieldErrors) {
          setFieldErrors(json.details.fieldErrors);
        }
        setError(json.error ?? "No se pudo guardar");
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("Error de red");
    } finally {
      setSubmitting(false);
    }
  };

  const err = (field: string) =>
    fieldErrors[field]?.[0] ? (
      <p className="text-xs text-destructive mt-1">{fieldErrors[field][0]}</p>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/50">
      <div className="bg-background rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {initialValues.isEdit ? "Editar fichaje" : "Añadir fichaje manual"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Los fichajes manuales quedan registrados en auditoría.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={initialValues.isEdit}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-secondary"
              required
            />
            {err("date")}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Entrada
              </label>
              <input
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                required
              />
              {err("clockIn")}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Salida{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <input
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
              {err("clockOut")}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Pausa (minutos)
            </label>
            <input
              type="number"
              min={0}
              max={600}
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            {err("breakMinutes")}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Motivo <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: olvidó fichar, corrección por error..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              required
            />
            {err("reason")}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Notas internas{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
