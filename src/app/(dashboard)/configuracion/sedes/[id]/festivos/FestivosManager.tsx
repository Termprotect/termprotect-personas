"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";

type Holiday = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  type: "NACIONAL" | "AUTONOMICO" | "LOCAL" | "CONVENIO";
};

export default function FestivosManager({
  sedeId,
  year,
  initialItems,
}: {
  sedeId: string;
  year: number;
  initialItems: Holiday[];
}) {
  const router = useRouter();
  const [items] = useState(initialItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (h: Holiday) => {
    setEditing(h);
    setModalOpen(true);
  };

  const deleteHoliday = async (h: Holiday) => {
    if (
      !confirm(
        `¿Eliminar festivo "${h.description}" del ${formatShort(h.date)}?`
      )
    )
      return;
    const res = await fetch(`/api/sedes/${sedeId}/calendar/${h.id}`, {
      method: "DELETE",
    });
    if (res.ok) router.refresh();
    else {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? "No se pudo eliminar");
    }
  };

  // Agrupar por mes
  const byMonth = new Map<number, Holiday[]>();
  for (const h of items) {
    const m = parseInt(h.date.slice(5, 7), 10) - 1;
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(h);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {items.length}{" "}
          {items.length === 1 ? "festivo registrado" : "festivos registrados"}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCopyOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-background border border-border rounded-lg text-sm font-medium text-foreground hover:border-border transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copiar año
          </button>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Añadir festivo
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-background rounded-xl border border-border p-10 text-center">
          <p className="text-muted-foreground font-medium">Sin festivos en {year}</p>
          <p className="text-muted-foreground text-sm mt-1">
            Añádelos uno a uno o cópialos de un año anterior.
          </p>
        </div>
      ) : (
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <Th>Fecha</Th>
                <Th>Descripción</Th>
                <Th>Tipo</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {Array.from(byMonth.keys())
                .sort((a, b) => a - b)
                .flatMap((month) => [
                  <tr key={`m-${month}`} className="bg-secondary/50">
                    <td
                      colSpan={4}
                      className="px-4 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground"
                    >
                      {monthName(month)}
                    </td>
                  </tr>,
                  ...byMonth.get(month)!.map((h) => (
                    <tr
                      key={h.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/50"
                    >
                      <Td className="capitalize font-medium text-foreground tabular-nums">
                        {formatLong(h.date)}
                      </Td>
                      <Td>{h.description}</Td>
                      <Td>
                        <TypeBadge type={h.type} />
                      </Td>
                      <Td className="text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(h)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted rounded-md mr-1"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteHoliday(h)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Td>
                    </tr>
                  )),
                ])}
            </tbody>
          </table>
        </div>
      )}

      <HolidayModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        sedeId={sedeId}
        year={year}
        editing={editing}
      />

      <CopyYearModal
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        sedeId={sedeId}
        toYear={year}
      />
    </>
  );
}

function HolidayModal({
  open,
  onClose,
  sedeId,
  year,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  sedeId: string;
  year: number;
  editing: Holiday | null;
}) {
  const router = useRouter();
  const [date, setDate] = useState(`${year}-01-01`);
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Holiday["type"]>("NACIONAL");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDate(editing.date);
      setDescription(editing.description);
      setType(editing.type);
    } else {
      setDate(`${year}-01-01`);
      setDescription("");
      setType("NACIONAL");
    }
    setError(null);
  }, [open, editing, year]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = editing
        ? `/api/sedes/${sedeId}/calendar/${editing.id}`
        : `/api/sedes/${sedeId}/calendar`;
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, description, type }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "No se pudo guardar");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/50">
      <div className="bg-background rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">
            {editing ? "Editar festivo" : "Nuevo festivo"}
          </h2>
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
              min={`${year}-01-01`}
              max={`${year}-12-31`}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Día de la Constitución"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Holiday["type"])}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-background"
            >
              <option value="NACIONAL">Nacional</option>
              <option value="AUTONOMICO">Autonómico</option>
              <option value="LOCAL">Local</option>
              <option value="CONVENIO">Convenio</option>
            </select>
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

function CopyYearModal({
  open,
  onClose,
  sedeId,
  toYear,
}: {
  open: boolean;
  onClose: () => void;
  sedeId: string;
  toYear: number;
}) {
  const router = useRouter();
  const [fromYear, setFromYear] = useState(toYear - 1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sedes/${sedeId}/calendar/copy-year`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromYear, toYear }),
        }
      );
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "No se pudo copiar");
        return;
      }
      router.refresh();
      onClose();
      alert(
        `Copiados: ${j.created} festivos. Omitidos (ya existían): ${j.skipped}.`
      );
    } catch {
      setError("Error de red");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/50">
      <div className="bg-background rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">
            Copiar festivos de otro año
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Copia todos los festivos del año origen al {toYear}. Los que ya
            existen en {toYear} no se duplicarán.
          </p>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Copiar desde el año
            </label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={fromYear}
              onChange={(e) => setFromYear(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              required
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
              Copiar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: Holiday["type"] }) {
  const cfg = {
    NACIONAL: { label: "Nacional", cls: "bg-destructive/10 text-destructive border-destructive/20" },
    AUTONOMICO: { label: "Autonómico", cls: "bg-warning/10 text-warning border-warning/20" },
    LOCAL: { label: "Local", cls: "bg-info/10 text-primary border-border" },
    CONVENIO: { label: "Convenio", cls: "bg-info/10 text-primary border-border" },
  }[type];
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 text-foreground ${className}`}>{children}</td>;
}

function monthName(m: number): string {
  return new Intl.DateTimeFormat("es-ES", { month: "long" }).format(
    new Date(2020, m, 1)
  );
}

function formatShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

function formatLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(y, m - 1, d));
}
