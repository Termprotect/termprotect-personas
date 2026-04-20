"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  MoreVertical,
  X,
} from "lucide-react";

type Status =
  | "INVITADO"
  | "ACTIVE"
  | "BAJA_MEDICA"
  | "EXCEDENCIA"
  | "BAJA_VOLUNTARIA"
  | "DESPIDO";

const STATUS_LABELS: Record<Status, string> = {
  INVITADO: "Invitado",
  ACTIVE: "Activo",
  BAJA_MEDICA: "Baja médica",
  EXCEDENCIA: "Excedencia",
  BAJA_VOLUNTARIA: "Baja voluntaria",
  DESPIDO: "Despido",
};

const REQUIRES_REASON: Status[] = ["BAJA_VOLUNTARIA", "DESPIDO", "EXCEDENCIA"];

// Transiciones permitidas desde cada estado
function allowedTransitions(current: Status): Status[] {
  switch (current) {
    case "ACTIVE":
      return ["BAJA_MEDICA", "EXCEDENCIA", "BAJA_VOLUNTARIA", "DESPIDO"];
    case "BAJA_MEDICA":
    case "EXCEDENCIA":
      return ["ACTIVE", "BAJA_VOLUNTARIA", "DESPIDO"];
    case "BAJA_VOLUNTARIA":
    case "DESPIDO":
      return ["ACTIVE"]; // readmisión
    case "INVITADO":
      return [];
  }
}

export default function EmployeeActions({
  employeeId,
  currentStatus,
  hasEmail,
}: {
  employeeId: string;
  currentStatus: Status;
  hasEmail: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<Status | null>(null);
  const [resending, setResending] = useState(false);
  const [toast, setToast] = useState<{
    kind: "ok" | "error";
    msg: string;
  } | null>(null);

  const transitions = allowedTransitions(currentStatus);

  const resend = async () => {
    if (!hasEmail) {
      setToast({ kind: "error", msg: "Este empleado no tiene email registrado" });
      return;
    }
    setResending(true);
    setToast(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}/resend-invitation`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setToast({ kind: "error", msg: json.error ?? "Error al reenviar" });
      } else {
        setToast({ kind: "ok", msg: "Invitación reenviada" });
        router.refresh();
      }
    } catch {
      setToast({ kind: "error", msg: "Error de red" });
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700"
        >
          <MoreVertical className="w-4 h-4" />
          Acciones
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[220px]">
              {currentStatus === "INVITADO" && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    resend();
                  }}
                  disabled={resending}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60 flex items-center gap-2"
                >
                  {resending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  Reenviar invitación
                </button>
              )}
              {transitions.length === 0 && currentStatus !== "INVITADO" && (
                <p className="px-3 py-2 text-xs text-slate-400">
                  Sin acciones disponibles
                </p>
              )}
              {transitions.length > 0 && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Cambiar estado
                  </p>
                  {transitions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setModal(s);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      → {STATUS_LABELS[s]}
                    </button>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {modal && (
        <StatusModal
          employeeId={employeeId}
          currentStatus={currentStatus}
          newStatus={modal}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            setToast({
              kind: "ok",
              msg: `Estado cambiado a ${STATUS_LABELS[modal]}`,
            });
            router.refresh();
          }}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-start gap-2 p-3 rounded-lg shadow-lg border text-sm ${
            toast.kind === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          {toast.kind === "ok" ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span>{toast.msg}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}

function StatusModal({
  employeeId,
  currentStatus,
  newStatus,
  onClose,
  onSuccess,
}: {
  employeeId: string;
  currentStatus: Status;
  newStatus: Status;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonRequired = REQUIRES_REASON.includes(newStatus);

  const submit = async () => {
    if (reasonRequired && !reason.trim()) {
      setError("Indica el motivo");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          effectiveDate,
          reason: reason.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo cambiar el estado");
        setSubmitting(false);
        return;
      }
      onSuccess();
    } catch {
      setError("Error de red");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Cambiar estado
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              De <strong>{STATUS_LABELS[currentStatus]}</strong> a{" "}
              <strong>{STATUS_LABELS[newStatus]}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Fecha efectiva <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Motivo {reasonRequired && <span className="text-rose-500">*</span>}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={
              reasonRequired
                ? "Motivo obligatorio (queda registrado en el historial)"
                : "Motivo opcional"
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>

        {(newStatus === "BAJA_VOLUNTARIA" || newStatus === "DESPIDO") && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            Esta acción registra fecha de fin de contrato y el empleado ya no
            podrá acceder a la app.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
