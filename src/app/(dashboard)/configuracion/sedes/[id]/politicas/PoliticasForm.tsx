"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

type Initial = {
  vacationDays: number;
  extraPersonalDays: number;
  notes: string;
};

export default function PoliticasForm({
  sedeId,
  year,
  initial,
}: {
  sedeId: string;
  year: number;
  initial: Initial;
}) {
  const router = useRouter();
  const [vacationDays, setVacationDays] = useState(
    String(initial.vacationDays)
  );
  const [extraPersonalDays, setExtraPersonalDays] = useState(
    String(initial.extraPersonalDays)
  );
  const [notes, setNotes] = useState(initial.notes);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/sedes/${sedeId}/policies`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          vacationDays: Number(vacationDays) || 0,
          extraPersonalDays: Number(extraPersonalDays) || 0,
          notes: notes || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "No se pudo guardar");
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="bg-background rounded-xl border border-border p-6 space-y-5"
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
          <span>Política guardada para {year}.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Días de vacaciones (laborables)
          </label>
          <input
            type="number"
            min={0}
            max={60}
            value={vacationDays}
            onChange={(e) => setVacationDays(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            required
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Se cuentan lunes a viernes, descontando festivos.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Días extra asuntos propios
          </label>
          <input
            type="number"
            min={0}
            max={20}
            value={extraPersonalDays}
            onChange={(e) => setExtraPersonalDays(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            required
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Ej: Madrid +2 para trámites personales. Usar 0 si no aplica.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Notas <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Referencias al convenio, condiciones especiales, etc."
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="flex items-center justify-end pt-2 border-t border-border">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg disabled:opacity-60"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar política
        </button>
      </div>
    </form>
  );
}
