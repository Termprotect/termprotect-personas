"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Paperclip,
  Loader2,
  AlertCircle,
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
  createdAt: string;
  employee: {
    id: string;
    nombres: string;
    apellidos: string;
    photoUrl: string | null;
    sedeName: string;
  };
  balance: {
    year: number;
    vacationAvailable: number;
    personalAvailable: number;
  } | null;
};

const fmt = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

export default function AprobacionesList({
  items,
  canActOn: _canActOn,
}: {
  items: Item[];
  canActOn: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const approve = (id: string) => {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/leave-requests/${id}/approve`, {
          method: "POST",
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(j.error ?? "No se pudo aprobar");
          return;
        }
        router.refresh();
      } catch {
        setError("Error de red");
      } finally {
        setBusyId(null);
      }
    });
  };

  const reject = (id: string) => {
    if (!rejectReason.trim() || rejectReason.trim().length < 3) {
      setError("Indica un motivo de rechazo (mín. 3 caracteres)");
      return;
    }
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/leave-requests/${id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectReason.trim() }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(j.error ?? "No se pudo rechazar");
          return;
        }
        setRejectingId(null);
        setRejectReason("");
        router.refresh();
      } catch {
        setError("Error de red");
      } finally {
        setBusyId(null);
      }
    });
  };

  const openAttachment = async (id: string) => {
    // Generamos URL firmada via endpoint (reutilizamos?) — en este caso el attachment es path del bucket,
    // como no es EmployeeDocument, llamamos directo a Supabase vía un endpoint dedicado o reutilizamos
    // Por simplicidad: abrimos un endpoint /api/leave-requests/[id]/attachment que devuelve signed URL.
    try {
      const res = await fetch(`/api/leave-requests/${id}/attachment`);
      const j = await res.json();
      if (res.ok && j.url) {
        window.open(j.url, "_blank");
      } else {
        setError(j.error ?? "No se pudo abrir el adjunto");
      }
    } catch {
      setError("Error de red");
    }
  };

  return (
    <div className="divide-y divide-border">
      {error && (
        <div className="px-5 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}

      {items.map((r) => (
        <div key={r.id} className="p-5 hover:bg-secondary">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
              {r.employee.photoUrl ? (
                <Image
                  src={r.employee.photoUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="w-10 h-10 object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">
                  {r.employee.nombres[0]}
                  {r.employee.apellidos[0]}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">
                  {r.employee.nombres} {r.employee.apellidos}
                </h3>
                <span className="text-xs text-muted-foreground">
                  · {r.employee.sedeName}
                </span>
                <StatusBadge status={r.status} />
              </div>

              <div className="mt-1 flex items-center gap-3 flex-wrap text-sm">
                <span className="font-medium text-foreground">
                  {r.typeLabel}
                </span>
                <span className="text-muted-foreground">
                  {fmt(r.startDate)} → {fmt(r.endDate)}
                </span>
                <span className="px-2 py-0.5 bg-muted rounded-md text-xs font-semibold text-foreground">
                  {r.totalDays} día{r.totalDays !== 1 ? "s" : ""}
                </span>
                {r.hasAttachment && (
                  <button
                    onClick={() => openAttachment(r.id)}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Paperclip className="w-3 h-3" />
                    Ver justificante
                  </button>
                )}
              </div>

              {r.notes && (
                <p className="mt-2 text-xs text-muted-foreground bg-secondary border border-border rounded-md px-2 py-1">
                  <strong className="text-muted-foreground">Notas:</strong> {r.notes}
                </p>
              )}

              {r.status === "RECHAZADA" && r.rejectedReason && (
                <p className="mt-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2 py-1">
                  <strong>Motivo rechazo:</strong> {r.rejectedReason}
                </p>
              )}

              {r.balance && (
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>
                    Saldo vac. {r.balance.year}:{" "}
                    <strong className="text-foreground">
                      {r.balance.vacationAvailable}
                    </strong>{" "}
                    disp.
                  </span>
                  <span>·</span>
                  <span>
                    Asuntos propios:{" "}
                    <strong className="text-foreground">
                      {r.balance.personalAvailable}
                    </strong>{" "}
                    disp.
                  </span>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground mt-2">
                Solicitado el {fmtDateTime(r.createdAt)}
              </p>

              {/* Acciones */}
              {r.status === "PENDIENTE" && rejectingId !== r.id && (
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => approve(r.id)}
                    disabled={pending && busyId === r.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-success hover:bg-success/90 text-white text-sm font-medium rounded-lg disabled:opacity-60"
                  >
                    {pending && busyId === r.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    Aprobar
                  </button>
                  <button
                    onClick={() => {
                      setRejectingId(r.id);
                      setRejectReason("");
                      setError(null);
                    }}
                    disabled={pending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-destructive/20 text-destructive hover:bg-destructive/10 text-sm font-medium rounded-lg disabled:opacity-60"
                  >
                    <XCircle className="w-3 h-3" />
                    Rechazar
                  </button>
                </div>
              )}

              {rejectingId === r.id && (
                <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2">
                  <label className="block text-xs font-semibold text-destructive">
                    Motivo de rechazo
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-destructive/20 rounded-md text-sm focus:outline-none focus:border-destructive"
                    placeholder="Ej: coincide con otro compañero en el mismo periodo"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => reject(r.id)}
                      disabled={pending && busyId === r.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-destructive hover:bg-destructive/90 text-white text-sm font-medium rounded-lg disabled:opacity-60"
                    >
                      {pending && busyId === r.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      Confirmar rechazo
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason("");
                      }}
                      disabled={pending}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
