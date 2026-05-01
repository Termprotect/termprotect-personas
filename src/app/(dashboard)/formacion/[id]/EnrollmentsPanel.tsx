"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  CheckCircle2,
  XCircle,
  Ban,
  Trash2,
  Upload,
  Download,
  Search,
  X,
} from "lucide-react";
import {
  ENROLLMENT_STATUS_LABELS,
  type EnrollmentUpdateInput,
} from "@/lib/validators/enrollment";

type EnrollmentRow = {
  id: string;
  status: "INSCRITO" | "COMPLETADO" | "NO_ASISTIO" | "CANCELADO";
  completedAt: string | null;
  hoursCompleted: number | null;
  hasCertificate: boolean;
  createdAt: string;
  employee: {
    id: string;
    fullName: string;
    position: string;
    sede: string;
  };
};

type Candidate = {
  id: string;
  fullName: string;
  position: string;
  sede: string;
};

type CompleteForm = {
  completedAt: string;
  hoursCompleted: string;
};

const STATUS_COLOR: Record<EnrollmentRow["status"], string> = {
  INSCRITO: "bg-sky-50 text-sky-700 border-sky-200",
  COMPLETADO: "bg-success/10 text-success border-success/20",
  NO_ASISTIO: "bg-warning/10 text-warning border-warning/20",
  CANCELADO: "bg-muted text-muted-foreground border-border",
};

export default function EnrollmentsPanel({
  trainingId,
  canManage,
  initialEnrollments,
  candidates,
}: {
  trainingId: string;
  canManage: boolean;
  initialEnrollments: EnrollmentRow[];
  candidates: Candidate[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [completeFor, setCompleteFor] = useState<string | null>(null);
  const [completeForm, setCompleteForm] = useState<CompleteForm>({
    completedAt: new Date().toISOString().slice(0, 10),
    hoursCompleted: "",
  });
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => startTransition(() => router.refresh());

  const totals = useMemo(() => {
    const t = {
      total: initialEnrollments.length,
      inscritos: 0,
      completados: 0,
      no_asistio: 0,
      cancelados: 0,
    };
    for (const e of initialEnrollments) {
      if (e.status === "INSCRITO") t.inscritos++;
      else if (e.status === "COMPLETADO") t.completados++;
      else if (e.status === "NO_ASISTIO") t.no_asistio++;
      else if (e.status === "CANCELADO") t.cancelados++;
    }
    return t;
  }, [initialEnrollments]);

  async function updateStatus(
    id: string,
    data: EnrollmentUpdateInput
  ) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/enrollments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error ?? "Error al actualizar");
      } else {
        refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeEnrollment(id: string) {
    if (!confirm("¿Eliminar la inscripción? Esta acción no se puede deshacer.")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/enrollments/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setErr(json.error ?? "Error al eliminar");
      else refresh();
    } finally {
      setBusy(false);
    }
  }

  async function openCertificate(id: string) {
    setErr(null);
    const res = await fetch(`/api/enrollments/${id}/certificate`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(json.error ?? "No se pudo abrir el certificado");
      return;
    }
    if (json.url) window.open(json.url, "_blank", "noopener,noreferrer");
  }

  function confirmComplete(id: string) {
    const row = initialEnrollments.find((e) => e.id === id);
    setCompleteForm({
      completedAt:
        row?.completedAt ?? new Date().toISOString().slice(0, 10),
      hoursCompleted:
        row?.hoursCompleted != null ? String(row.hoursCompleted) : "",
    });
    setCompleteFor(id);
  }

  async function submitComplete() {
    if (!completeFor) return;
    await updateStatus(completeFor, {
      status: "COMPLETADO",
      completedAt: completeForm.completedAt,
      hoursCompleted: completeForm.hoursCompleted
        ? Number(completeForm.hoursCompleted)
        : undefined,
    });
    setCompleteFor(null);
  }

  return (
    <div className="bg-background rounded-xl border border-border">
      <div className="flex items-center justify-between p-4 border-b border-border gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Inscripciones</h2>
          <span className="text-xs text-muted-foreground">
            {totals.total} · {totals.inscritos} inscritos · {totals.completados} completados
          </span>
        </div>
        {canManage && (
          <button
            onClick={() => setShowPicker(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-sm rounded-lg"
          >
            <UserPlus className="w-4 h-4" />
            Inscribir empleados
          </button>
        )}
      </div>

      {err && (
        <div className="m-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {err}
        </div>
      )}

      {initialEnrollments.length === 0 ? (
        <div className="p-10 text-center">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aún no hay empleados inscritos.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Empleado</th>
                <th className="px-4 py-2 text-left">Sede</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Finalización</th>
                <th className="px-4 py-2 text-left">Horas</th>
                <th className="px-4 py-2 text-left">Certificado</th>
                {canManage && <th className="px-4 py-2 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initialEnrollments.map((e) => (
                <tr key={e.id} className="hover:bg-secondary">
                  <td className="px-4 py-2">
                    <p className="font-medium text-foreground">{e.employee.fullName}</p>
                    {e.employee.position && (
                      <p className="text-xs text-muted-foreground">{e.employee.position}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{e.employee.sede || "—"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 border rounded-md text-xs font-semibold ${STATUS_COLOR[e.status]}`}
                    >
                      {ENROLLMENT_STATUS_LABELS[e.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {e.completedAt
                      ? e.completedAt.split("-").reverse().join("/")
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {e.hoursCompleted != null ? `${e.hoursCompleted} h` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <CertificateCell
                      enrollmentId={e.id}
                      hasCertificate={e.hasCertificate}
                      canUpload={canManage || false}
                      onOpen={() => openCertificate(e.id)}
                      onUploaded={refresh}
                    />
                  </td>
                  {canManage && (
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {e.status !== "COMPLETADO" && (
                          <button
                            disabled={busy}
                            onClick={() => confirmComplete(e.id)}
                            className="p-1.5 text-success hover:bg-success/10 rounded-md disabled:opacity-50"
                            title="Marcar completado"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {e.status !== "NO_ASISTIO" && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              updateStatus(e.id, { status: "NO_ASISTIO" })
                            }
                            className="p-1.5 text-warning hover:bg-warning/10 rounded-md disabled:opacity-50"
                            title="No asistió"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {e.status !== "CANCELADO" && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              updateStatus(e.id, { status: "CANCELADO" })
                            }
                            className="p-1.5 text-muted-foreground hover:bg-muted rounded-md disabled:opacity-50"
                            title="Cancelar"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        {e.status !== "INSCRITO" && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              updateStatus(e.id, { status: "INSCRITO" })
                            }
                            className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-md disabled:opacity-50 text-xs font-semibold"
                            title="Volver a inscrito"
                          >
                            ↺
                          </button>
                        )}
                        <button
                          disabled={busy}
                          onClick={() => removeEnrollment(e.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md disabled:opacity-50"
                          title="Eliminar inscripción"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPicker && (
        <EmployeePicker
          trainingId={trainingId}
          candidates={candidates}
          onClose={() => setShowPicker(false)}
          onDone={() => {
            setShowPicker(false);
            refresh();
          }}
        />
      )}

      {completeFor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl max-w-sm w-full p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-foreground">
                Marcar como completado
              </h3>
              <button
                onClick={() => setCompleteFor(null)}
                className="p-1 text-muted-foreground hover:text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Fecha de finalización
                </label>
                <input
                  type="date"
                  value={completeForm.completedAt}
                  onChange={(e) =>
                    setCompleteForm({ ...completeForm, completedAt: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Horas completadas (opcional)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={completeForm.hoursCompleted}
                  onChange={(e) =>
                    setCompleteForm({
                      ...completeForm,
                      hoursCompleted: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  placeholder="Ej: 8"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setCompleteFor(null)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg"
              >
                Cancelar
              </button>
              <button
                disabled={busy || !completeForm.completedAt}
                onClick={submitComplete}
                className="px-3 py-1.5 text-sm bg-success hover:bg-success/90 disabled:opacity-50 text-white rounded-lg"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CertificateCell({
  enrollmentId,
  hasCertificate,
  canUpload,
  onOpen,
  onUploaded,
}: {
  enrollmentId: string;
  hasCertificate: boolean;
  canUpload: boolean;
  onOpen: () => void;
  onUploaded: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(f: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(`/api/enrollments/${enrollmentId}/certificate`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        onUploaded();
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error ?? "Error al subir certificado");
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-1">
      {hasCertificate ? (
        <button
          onClick={onOpen}
          className="inline-flex items-center gap-1 px-2 py-1 text-success hover:bg-success/10 rounded-md text-xs font-semibold"
        >
          <Download className="w-3.5 h-3.5" />
          Ver
        </button>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )}
      {canUpload && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <button
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="p-1 text-muted-foreground hover:bg-muted rounded-md disabled:opacity-50"
            title={hasCertificate ? "Reemplazar" : "Subir certificado"}
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

function EmployeePicker({
  trainingId,
  candidates,
  onClose,
  onDone,
}: {
  trainingId: string;
  candidates: Candidate[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return candidates;
    return candidates.filter(
      (c) =>
        c.fullName.toLowerCase().includes(needle) ||
        c.position.toLowerCase().includes(needle) ||
        c.sede.toLowerCase().includes(needle)
    );
  }, [q, candidates]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (filtered.every((c) => selected.has(c.id))) {
      const next = new Set(selected);
      for (const c of filtered) next.delete(c.id);
      setSelected(next);
    } else {
      const next = new Set(selected);
      for (const c of filtered) next.add(c.id);
      setSelected(next);
    }
  }

  async function submit() {
    if (selected.size === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/trainings/${trainingId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: Array.from(selected) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error ?? "Error al inscribir");
      } else {
        onDone();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl max-w-2xl w-full flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">
            Inscribir empleados
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, puesto o sede…"
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{selected.size} seleccionados · {filtered.length} mostrados</span>
            <button
              onClick={toggleAll}
              className="text-sky-600 hover:text-sky-700 font-semibold"
            >
              {filtered.every((c) => selected.has(c.id)) && filtered.length > 0
                ? "Quitar todos"
                : "Seleccionar todos"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {candidates.length === 0
                ? "Todos los empleados ya están inscritos."
                : "Sin resultados para esta búsqueda."}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((c) => {
                const checked = selected.has(c.id);
                return (
                  <li key={c.id}>
                    <label
                      className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${
                        checked ? "bg-sky-50" : "hover:bg-secondary"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(c.id)}
                        className="rounded border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {c.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[c.position, c.sede].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {err && (
          <div className="m-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {err}
          </div>
        )}

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg"
          >
            Cancelar
          </button>
          <button
            disabled={busy || selected.size === 0}
            onClick={submit}
            className="px-3 py-1.5 text-sm bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg"
          >
            {busy
              ? "Inscribiendo…"
              : `Inscribir ${selected.size > 0 ? `(${selected.size})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
