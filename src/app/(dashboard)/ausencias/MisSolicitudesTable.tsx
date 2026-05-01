"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  Paperclip,
  Loader2,
} from "lucide-react";

type Item = {
  id: string;
  type: string;
  typeLabel: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: "PENDIENTE" | "APROBADA" | "RECHAZADA" | "CANCELADA";
  notes: string | null;
  rejectedReason: string | null;
  hasAttachment: boolean;
};

const fmt = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

function StatusBadge({ status }: { status: Item["status"] }) {
  const map = {
    PENDIENTE: {
      bg: "bg-warning/10",
      text: "text-warning",
      border: "border-warning/20",
      icon: <Clock className="w-3 h-3" />,
      label: "Pendiente",
    },
    APROBADA: {
      bg: "bg-success/10",
      text: "text-success",
      border: "border-success/20",
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: "Aprobada",
    },
    RECHAZADA: {
      bg: "bg-destructive/10",
      text: "text-destructive",
      border: "border-destructive/20",
      icon: <XCircle className="w-3 h-3" />,
      label: "Rechazada",
    },
    CANCELADA: {
      bg: "bg-secondary",
      text: "text-muted-foreground",
      border: "border-border",
      icon: <Ban className="w-3 h-3" />,
      label: "Cancelada",
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md border ${map.bg} ${map.text} ${map.border}`}
    >
      {map.icon}
      {map.label}
    </span>
  );
}

export default function MisSolicitudesTable({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancel = (id: string) => {
    if (!confirm("¿Seguro que quieres cancelar esta solicitud?")) return;
    setError(null);
    setCancellingId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/leave-requests/${id}/cancel`, {
          method: "POST",
        });
        const j = await res.json();
        if (!res.ok) {
          setError(j.error ?? "No se pudo cancelar");
          setCancellingId(null);
          return;
        }
        router.refresh();
      } catch {
        setError("Error de red");
      } finally {
        setCancellingId(null);
      }
    });
  };

  return (
    <div className="overflow-x-auto">
      {error && (
        <div className="px-5 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs">
          {error}
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="bg-secondary text-muted-foreground text-xs uppercase">
          <tr>
            <th className="text-left px-4 py-2 font-semibold">Tipo</th>
            <th className="text-left px-4 py-2 font-semibold">Desde</th>
            <th className="text-left px-4 py-2 font-semibold">Hasta</th>
            <th className="text-right px-4 py-2 font-semibold">Días</th>
            <th className="text-left px-4 py-2 font-semibold">Estado</th>
            <th className="text-left px-4 py-2 font-semibold">Notas</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((r) => (
            <tr key={r.id} className="hover:bg-secondary">
              <td className="px-4 py-2 text-foreground">
                <div className="flex items-center gap-1.5">
                  <span>{r.typeLabel}</span>
                  {r.hasAttachment && (
                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              </td>
              <td className="px-4 py-2 text-foreground">{fmt(r.startDate)}</td>
              <td className="px-4 py-2 text-foreground">{fmt(r.endDate)}</td>
              <td className="px-4 py-2 text-right font-semibold text-foreground">
                {r.totalDays}
              </td>
              <td className="px-4 py-2">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-4 py-2 text-muted-foreground text-xs max-w-[240px] truncate">
                {r.status === "RECHAZADA" && r.rejectedReason
                  ? r.rejectedReason
                  : r.notes ?? "—"}
              </td>
              <td className="px-4 py-2 text-right">
                {r.status === "PENDIENTE" && (
                  <button
                    onClick={() => cancel(r.id)}
                    disabled={pending && cancellingId === r.id}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-md disabled:opacity-50"
                  >
                    {pending && cancellingId === r.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Ban className="w-3 h-3" />
                    )}
                    Cancelar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
