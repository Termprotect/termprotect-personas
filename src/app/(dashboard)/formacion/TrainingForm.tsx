"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import {
  TRAINING_MODES,
  TRAINING_MODE_LABELS,
  MANDATORY_TYPES,
  MANDATORY_TYPE_LABELS,
} from "@/lib/validators/training";

type Initial = {
  id?: string;
  title: string;
  provider: string;
  mode: (typeof TRAINING_MODES)[number];
  hours: string;
  cost: string;
  mandatory: boolean;
  mandatoryType: string;
  fundaeEligible: boolean;
  description: string;
  startDate: string;
  endDate: string;
};

export default function TrainingForm({
  initial,
  mode,
}: {
  initial: Initial;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = <K extends keyof Initial>(k: K, v: Initial[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const url =
        mode === "create" ? "/api/trainings" : `/api/trainings/${initial.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          provider: form.provider || undefined,
          mode: form.mode,
          hours: Number(form.hours),
          cost: form.cost ? Number(form.cost) : undefined,
          mandatory: form.mandatory,
          mandatoryType: form.mandatory ? form.mandatoryType : undefined,
          fundaeEligible: form.fundaeEligible,
          description: form.description || undefined,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "No se pudo guardar");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        if (mode === "create") {
          router.push(`/formacion/${j.id}`);
        } else {
          router.push(`/formacion/${initial.id}`);
        }
        router.refresh();
      }, 500);
    } catch {
      setError("Error de red");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!initial.id) return;
    if (!confirm("¿Seguro que quieres eliminar esta formación?")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/trainings/${initial.id}`, {
        method: "DELETE",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "No se pudo eliminar");
        return;
      }
      router.push("/formacion");
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
          <span>Guardado correctamente.</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Título
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Ej: Curso PRL básico 2026"
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          required
          minLength={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Proveedor <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={form.provider}
            onChange={(e) => update("provider", e.target.value)}
            placeholder="Ej: Fundación Estatal, proveedor externo..."
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Modalidad
          </label>
          <select
            value={form.mode}
            onChange={(e) => update("mode", e.target.value as Initial["mode"])}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            {TRAINING_MODES.map((m) => (
              <option key={m} value={m}>
                {TRAINING_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Horas
          </label>
          <input
            type="number"
            min={0.5}
            max={1000}
            step={0.5}
            value={form.hours}
            onChange={(e) => update("hours", e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Coste € <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.cost}
            onChange={(e) => update("cost", e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg w-full cursor-pointer hover:bg-secondary">
            <input
              type="checkbox"
              checked={form.fundaeEligible}
              onChange={(e) => update("fundaeEligible", e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-foreground">
              Bonificable FUNDAE
            </span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Fecha inicio <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => update("startDate", e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Fecha fin <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => update("endDate", e.target.value)}
            min={form.startDate || undefined}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Obligatoria */}
      <div className="p-4 bg-secondary rounded-lg border border-border space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.mandatory}
            onChange={(e) => update("mandatory", e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm font-semibold text-foreground">
            Formación obligatoria (PRL, RGPD, Igualdad...)
          </span>
        </label>
        {form.mandatory && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Tipo
            </label>
            <select
              value={form.mandatoryType}
              onChange={(e) => update("mandatoryType", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-background"
              required={form.mandatory}
            >
              <option value="">— Selecciona —</option>
              {MANDATORY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {MANDATORY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
          placeholder="Contenido, objetivos, duración del temario..."
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div>
          {mode === "edit" && (
            <button
              type="button"
              onClick={remove}
              disabled={submitting}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg"
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg disabled:opacity-60"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "create" ? "Crear formación" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </form>
  );
}
