"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Plus,
  X,
  Play,
  Lock,
  Trash2,
  ClipboardList,
} from "lucide-react";

type Cycle = {
  id: string;
  name: string;
  kind: "ANNUAL" | "MONTHLY_PEER";
  startDate: string;
  endDate: string;
  status: "BORRADOR" | "ACTIVO" | "CERRADO";
  total: number;
  byStatus: Record<string, number>;
};

const KIND_BADGE: Record<Cycle["kind"], string> = {
  ANNUAL: "bg-accent/15 text-accent border-accent/30",
  MONTHLY_PEER: "bg-info/10 text-primary border-border",
};
const KIND_LABEL: Record<Cycle["kind"], string> = {
  ANNUAL: "Anual",
  MONTHLY_PEER: "Pares",
};

const STATUS_COLOR: Record<string, string> = {
  BORRADOR: "bg-muted text-foreground border-border",
  ACTIVO: "bg-success/10 text-success border-success/20",
  CERRADO: "bg-secondary text-muted-foreground border-border",
};

export default function CiclosClient({
  initial,
  labels,
}: {
  initial: Cycle[];
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const refresh = () => startTransition(() => router.refresh());

  async function transition(
    id: string,
    status: "ACTIVO" | "CERRADO"
  ) {
    const label = status === "ACTIVO" ? "activar" : "cerrar";
    if (
      !confirm(
        status === "CERRADO"
          ? "¿Cerrar el ciclo? Las evaluaciones pendientes ya no podrán modificarse."
          : "¿Activar el ciclo? Los empleados podrán completar su autoevaluación."
      )
    )
      return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/eval-cycles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setErr(json.error ?? `Error al ${label}`);
      else refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este ciclo borrador?")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/eval-cycles/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setErr(json.error ?? "Error al eliminar");
      else refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Nuevo ciclo
        </button>
      </div>

      {err && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {err}
        </div>
      )}

      {initial.length === 0 ? (
        <div className="bg-background rounded-xl border border-dashed border-border p-10 text-center">
          <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">
            Todavía no has creado ningún ciclo.
          </p>
        </div>
      ) : (
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Fechas</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Evaluaciones</th>
                  <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initial.map((c) => {
                  const done = c.byStatus.CERRADA ?? 0;
                  return (
                    <tr key={c.id} className="hover:bg-secondary">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/evaluaciones/ciclos/${c.id}`}
                            className="font-medium text-foreground hover:text-accent"
                          >
                            {c.name}
                          </Link>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 border rounded text-[10px] font-semibold ${KIND_BADGE[c.kind]}`}
                          >
                            {KIND_LABEL[c.kind]}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        {c.startDate.split("-").reverse().join("/")} →{" "}
                        {c.endDate.split("-").reverse().join("/")}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 border rounded-md text-xs font-semibold ${STATUS_COLOR[c.status]}`}
                        >
                          {labels[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-foreground text-xs">
                        <p className="font-semibold">{c.total}</p>
                        {c.total > 0 && (
                          <p className="text-muted-foreground">
                            {done} cerradas · {c.byStatus.PENDIENTE ?? 0} pdtes
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/evaluaciones/ciclos/${c.id}`}
                            className="px-2 py-1 text-xs text-accent hover:bg-accent/15 rounded-md font-semibold"
                          >
                            Gestionar
                          </Link>
                          {c.status === "BORRADOR" && (
                            <>
                              <button
                                disabled={busy}
                                onClick={() => transition(c.id, "ACTIVO")}
                                className="p-1.5 text-success hover:bg-success/10 rounded-md disabled:opacity-50"
                                title="Activar ciclo"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => remove(c.id)}
                                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md disabled:opacity-50"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {c.status === "ACTIVO" && (
                            <button
                              disabled={busy}
                              onClick={() => transition(c.id, "CERRADO")}
                              className="p-1.5 text-muted-foreground hover:bg-muted rounded-md disabled:opacity-50"
                              title="Cerrar ciclo"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNew && <NewCycleModal onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); refresh(); }} />}
    </div>
  );
}

function NewCycleModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"ANNUAL" | "MONTHLY_PEER">("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/eval-cycles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind, startDate, endDate }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setErr(json.error ?? "Error al crear");
      else onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl max-w-md w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground">Nuevo ciclo</h3>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Evaluación semestral S1 2026"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Tipo
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKind("ANNUAL")}
                className={`px-3 py-2 border rounded-lg text-xs text-left ${
                  kind === "ANNUAL"
                    ? "bg-accent/15 border-accent/40 text-accent"
                    : "border-border text-muted-foreground hover:border-border"
                }`}
              >
                <p className="font-semibold">Anual</p>
                <p className="text-[11px] mt-0.5">
                  8 competencias · autoeval + manager
                </p>
              </button>
              <button
                type="button"
                onClick={() => setKind("MONTHLY_PEER")}
                className={`px-3 py-2 border rounded-lg text-xs text-left ${
                  kind === "MONTHLY_PEER"
                    ? "bg-info/10 border-accent/50 text-foreground"
                    : "border-border text-muted-foreground hover:border-border"
                }`}
              >
                <p className="font-semibold">Mensual por pares</p>
                <p className="text-[11px] mt-0.5">
                  Plantilla a medida · varios evaluadores
                </p>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
        {err && (
          <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
            {err}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg"
          >
            Cancelar
          </button>
          <button
            disabled={busy || !name || !startDate || !endDate}
            onClick={submit}
            className="px-3 py-1.5 text-sm bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg"
          >
            {busy ? "Creando…" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}
