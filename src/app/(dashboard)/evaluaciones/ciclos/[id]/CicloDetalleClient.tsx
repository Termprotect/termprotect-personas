"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  UserPlus,
  Search,
  X,
  AlertTriangle,
  Users,
  Trash2,
} from "lucide-react";

type Row = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePosition: string;
  employeeSede: string;
  employeeDepartment: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorType: "MANAGER" | "PEER" | "SELF";
  templateId: string | null;
  templateName: string | null;
  status: string;
  statusLabel: string;
  statusColor: string;
  overallScore: number | null;
  pip: { id: string; status: string } | null;
};

type TemplateLite = {
  id: string;
  name: string;
  description: string | null;
  questionCount: number;
};

type EmployeeLite = {
  id: string;
  name: string;
  position: string;
  department: string;
  sedeName: string;
};

export default function CicloDetalleClient({
  cycleId,
  cycleStatus,
  cycleKind,
  sedes,
  rows,
  templates,
  employees,
}: {
  cycleId: string;
  cycleStatus: "BORRADOR" | "ACTIVO" | "CERRADO";
  cycleKind: "ANNUAL" | "MONTHLY_PEER";
  sedes: { id: string; name: string }[];
  rows: Row[];
  templates: TemplateLite[];
  employees: EmployeeLite[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());

  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [showPeerAdd, setShowPeerAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let out = rows;
    const needle = q.trim().toLowerCase();
    if (needle) {
      out = out.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(needle) ||
          r.evaluatorName.toLowerCase().includes(needle) ||
          r.employeeSede.toLowerCase().includes(needle) ||
          r.employeeDepartment.toLowerCase().includes(needle) ||
          (r.templateName?.toLowerCase().includes(needle) ?? false)
      );
    }
    if (filterStatus) {
      out = out.filter((r) => r.status === filterStatus);
    }
    return out;
  }, [rows, q, filterStatus]);

  async function closeAllMgrCompleted() {
    const toClose = rows.filter((r) => r.status === "MANAGER_COMPLETADA");
    if (toClose.length === 0) return;
    if (
      !confirm(
        `¿Cerrar ${toClose.length} evaluaciones con revisión manager completada?`
      )
    )
      return;
    setBusy(true);
    setErr(null);
    try {
      for (const r of toClose) {
        const res = await fetch(`/api/evaluations/${r.id}?action=close`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setErr(json.error ?? "Error al cerrar");
          break;
        }
      }
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removePeerEvaluation(evaluationId: string) {
    if (!confirm("¿Retirar este evaluador asignado?")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/eval-cycles/${cycleId}/peer-setup?evaluationId=${evaluationId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "Error");
      } else {
        refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  // Agrupar por sujeto cuando es peer (para vista resumida opcional)
  const peerGroups = useMemo(() => {
    if (cycleKind !== "MONTHLY_PEER") return null;
    const map = new Map<
      string,
      { subjectName: string; templateName: string | null; rows: Row[] }
    >();
    for (const r of rows) {
      const key = `${r.employeeId}|${r.templateId ?? ""}`;
      if (!map.has(key)) {
        map.set(key, {
          subjectName: r.employeeName,
          templateName: r.templateName,
          rows: [],
        });
      }
      map.get(key)!.rows.push(r);
    }
    return Array.from(map.values());
  }, [cycleKind, rows]);

  const isPeer = cycleKind === "MONTHLY_PEER";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {cycleStatus !== "CERRADO" && !isPeer && (
            <button
              onClick={() => setShowGenerate(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-sm rounded-lg"
            >
              <UserPlus className="w-4 h-4" />
              Generar evaluaciones
            </button>
          )}
          {cycleStatus !== "CERRADO" && isPeer && (
            <button
              onClick={() => setShowPeerAdd(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary text-white text-sm rounded-lg"
            >
              <Users className="w-4 h-4" />
              Añadir evaluado
            </button>
          )}
          {cycleStatus === "ACTIVO" && (
            <button
              disabled={busy}
              onClick={closeAllMgrCompleted}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-success hover:bg-success/90 text-white text-sm rounded-lg disabled:opacity-50"
            >
              Cerrar todas las revisadas
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              className="pl-7 pr-3 py-1.5 border border-border rounded-lg text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-lg text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendientes</option>
            {!isPeer && (
              <option value="AUTOEVALUACION_COMPLETADA">
                Autoeval. completada
              </option>
            )}
            <option value="MANAGER_COMPLETADA">
              {isPeer ? "Respondidas" : "Rev. manager"}
            </option>
            <option value="CERRADA">Cerradas</option>
          </select>
        </div>
      </div>

      {err && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {err}
        </div>
      )}

      {isPeer && peerGroups && peerGroups.length > 0 && (
        <div className="bg-background rounded-xl border border-border p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Resumen por evaluado
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {peerGroups.map((g, i) => {
              const pending = g.rows.filter((r) => r.status === "PENDIENTE").length;
              const done = g.rows.length - pending;
              return (
                <div
                  key={i}
                  className="border border-border rounded-lg p-2 text-sm"
                >
                  <p className="font-medium text-foreground">{g.subjectName}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.templateName ?? "Sin plantilla"} ·{" "}
                    {g.rows.length} evaluador(es) · {done} hechas / {pending}{" "}
                    pendientes
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="bg-background rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {isPeer
              ? "Aún no hay evaluaciones en este ciclo. Añade un evaluado con su plantilla y evaluadores."
              : "Aún no hay evaluaciones en este ciclo. Genera las evaluaciones para empezar."}
          </p>
        </div>
      ) : (
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Empleado</th>
                  <th className="px-4 py-2 text-left">
                    {isPeer ? "Plantilla" : "Sede / Depto."}
                  </th>
                  <th className="px-4 py-2 text-left">Evaluador</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Nota</th>
                  {!isPeer && <th className="px-4 py-2 text-left">PIP</th>}
                  <th className="px-4 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary">
                    <td className="px-4 py-2">
                      <p className="font-medium text-foreground">
                        {r.employeeName}
                      </p>
                      {r.employeePosition && (
                        <p className="text-xs text-muted-foreground">
                          {r.employeePosition}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {isPeer ? (
                        r.templateName ?? "—"
                      ) : (
                        <>
                          {r.employeeSede}
                          {r.employeeDepartment && ` · ${r.employeeDepartment}`}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2 text-foreground text-xs">
                      {r.evaluatorName}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 border rounded-md text-xs font-semibold ${r.statusColor}`}
                      >
                        {r.statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-foreground font-semibold">
                      {r.overallScore != null
                        ? r.overallScore.toFixed(2)
                        : "—"}
                    </td>
                    {!isPeer && (
                      <td className="px-4 py-2">
                        {r.pip ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-md text-[10px] font-semibold"
                            title={`PIP ${r.pip.status}`}
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {r.pip.status}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/evaluaciones/${r.id}`}
                          className="text-sky-700 font-semibold hover:text-sky-800 text-sm"
                        >
                          Abrir →
                        </Link>
                        {isPeer && r.status === "PENDIENTE" && cycleStatus !== "CERRADO" && (
                          <button
                            onClick={() => removePeerEvaluation(r.id)}
                            disabled={busy}
                            className="p-1 text-destructive hover:bg-destructive/10 rounded disabled:opacity-50"
                            title="Retirar evaluador"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showGenerate && (
        <GenerateModal
          cycleId={cycleId}
          sedes={sedes}
          cycleStatus={cycleStatus}
          onClose={() => setShowGenerate(false)}
          onDone={() => {
            setShowGenerate(false);
            refresh();
          }}
        />
      )}

      {showPeerAdd && (
        <PeerAddModal
          cycleId={cycleId}
          cycleStatus={cycleStatus}
          employees={employees}
          templates={templates}
          onClose={() => setShowPeerAdd(false)}
          onDone={() => {
            setShowPeerAdd(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function GenerateModal({
  cycleId,
  sedes,
  cycleStatus,
  onClose,
  onDone,
}: {
  cycleId: string;
  sedes: { id: string; name: string }[];
  cycleStatus: "BORRADOR" | "ACTIVO" | "CERRADO";
  onClose: () => void;
  onDone: () => void;
}) {
  const [sedeId, setSedeId] = useState("");
  const [department, setDepartment] = useState("");
  const [activate, setActivate] = useState(cycleStatus === "BORRADOR");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    total: number;
  } | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/eval-cycles/${cycleId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sedeId: sedeId || undefined,
          department: department || undefined,
          activate,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error ?? "Error al generar");
      } else {
        setResult(json);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl max-w-md w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground">
            Generar evaluaciones
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {result ? (
          <div>
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success mb-3">
              <p className="font-semibold">Evaluaciones generadas</p>
              <p className="text-xs mt-1">
                Creadas: {result.created} · Ya existían: {result.skipped} · Total
                elegibles: {result.total}
              </p>
            </div>
            <button
              onClick={onDone}
              className="w-full px-3 py-2 bg-primary hover:bg-primary/90 text-white text-sm rounded-lg"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              Se creará una evaluación por cada empleado activo. El evaluador por
              defecto es su jefe directo (RRHH en caso de no tenerlo).
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Sede (opcional)
                </label>
                <select
                  value={sedeId}
                  onChange={(e) => setSedeId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                >
                  <option value="">Todas las sedes</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Departamento (opcional)
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Ej: Comercial"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>
              {cycleStatus === "BORRADOR" && (
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={activate}
                    onChange={(e) => setActivate(e.target.checked)}
                  />
                  Activar el ciclo tras generar
                </label>
              )}
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
                disabled={busy}
                onClick={submit}
                className="px-3 py-1.5 text-sm bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg"
              >
                {busy ? "Generando…" : "Generar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PeerAddModal({
  cycleId,
  cycleStatus,
  employees,
  templates,
  onClose,
  onDone,
}: {
  cycleId: string;
  cycleStatus: "BORRADOR" | "ACTIVO" | "CERRADO";
  employees: EmployeeLite[];
  templates: TemplateLite[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [evaluatorIds, setEvaluatorIds] = useState<Set<string>>(new Set());
  const [evalSearch, setEvalSearch] = useState("");
  const [activate, setActivate] = useState(cycleStatus === "BORRADOR");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const evalCandidates = useMemo(() => {
    const needle = evalSearch.trim().toLowerCase();
    const out = employees.filter((e) => e.id !== subjectId);
    if (!needle) return out;
    return out.filter(
      (e) =>
        e.name.toLowerCase().includes(needle) ||
        e.department.toLowerCase().includes(needle) ||
        e.sedeName.toLowerCase().includes(needle)
    );
  }, [employees, subjectId, evalSearch]);

  function toggle(id: string) {
    setEvaluatorIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!subjectId) {
      setErr("Selecciona el empleado evaluado");
      return;
    }
    if (!templateId) {
      setErr("Selecciona una plantilla");
      return;
    }
    if (evaluatorIds.size === 0) {
      setErr("Asigna al menos un evaluador");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/eval-cycles/${cycleId}/peer-setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: [
            {
              subjectId,
              templateId,
              evaluatorIds: Array.from(evaluatorIds),
            },
          ],
          activate,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error ?? "Error");
      } else {
        onDone();
      }
    } finally {
      setBusy(false);
    }
  }

  if (templates.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-xl max-w-md w-full p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground">
              Añadir evaluado
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-muted-foreground hover:text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            No hay plantillas disponibles. Crea una primero en{" "}
            <Link
              href="/evaluaciones/plantillas"
              className="text-sky-700 font-semibold"
            >
              Plantillas
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl max-w-2xl w-full p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground">
            Añadir evaluado
          </h3>
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
              Empleado evaluado
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            >
              <option value="">— Selecciona —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.department ? ` · ${e.department}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Plantilla de preguntas
            </label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.questionCount} preg.)
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Evaluadores ({evaluatorIds.size} seleccionados)
              </label>
              <input
                type="text"
                value={evalSearch}
                onChange={(e) => setEvalSearch(e.target.value)}
                placeholder="Buscar…"
                className="px-2 py-1 border border-border rounded text-xs"
              />
            </div>
            <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
              {evalCandidates.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">Sin candidatos.</p>
              ) : (
                evalCandidates.map((e) => (
                  <label
                    key={e.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-secondary cursor-pointer border-b border-border last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={evaluatorIds.has(e.id)}
                      onChange={() => toggle(e.id)}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="font-medium text-foreground">
                        {e.name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        {e.position}
                        {e.department ? ` · ${e.department}` : ""}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {cycleStatus === "BORRADOR" && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={activate}
                onChange={(e) => setActivate(e.target.checked)}
              />
              Activar el ciclo tras añadir
            </label>
          )}

          {err && (
            <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
              {err}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg"
            >
              Cancelar
            </button>
            <button
              disabled={busy}
              onClick={submit}
              className="px-3 py-1.5 text-sm bg-primary hover:bg-primary disabled:opacity-50 text-white rounded-lg"
            >
              {busy ? "Añadiendo…" : "Añadir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
