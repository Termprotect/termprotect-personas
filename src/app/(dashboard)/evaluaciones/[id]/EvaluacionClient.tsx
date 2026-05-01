"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  Send,
  Lock,
  AlertTriangle,
  Save,
  Trash2,
} from "lucide-react";

type Scores = Record<string, number>;

type Props = {
  evaluationId: string;
  cycleStatus: "BORRADOR" | "ACTIVO" | "CERRADO";
  cycleKind: "ANNUAL" | "MONTHLY_PEER";
  status:
    | "PENDIENTE"
    | "AUTOEVALUACION_COMPLETADA"
    | "MANAGER_COMPLETADA"
    | "CERRADA";
  isOwner: boolean;
  isEvaluator: boolean;
  isStaff: boolean;
  isPeer: boolean;
  templateName: string | null;
  dimensions: string[];
  labels: Record<string, string>;
  initialSelf: { scores: Scores; comments: string };
  initialManager: { scores: Scores; comments: string; pipRequired: boolean };
  initialPip:
    | {
        objectives: string;
        deadline: string;
        status: "ACTIVO" | "COMPLETADO" | "ARCHIVADO";
        notes: string;
      }
    | null;
};

const SCALE_LABELS: Record<number, string> = {
  1: "Muy por debajo",
  2: "Por debajo",
  3: "Cumple",
  4: "Por encima",
  5: "Excelente",
};

export default function EvaluacionClient(props: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());

  const canSelf =
    !props.isPeer &&
    props.isOwner &&
    props.status === "PENDIENTE" &&
    props.cycleStatus === "ACTIVO";
  const canManager = props.isPeer
    ? (props.isEvaluator || props.isStaff) &&
      props.status === "PENDIENTE" &&
      props.cycleStatus === "ACTIVO"
    : (props.isEvaluator || props.isStaff) &&
      props.status === "AUTOEVALUACION_COMPLETADA" &&
      props.cycleStatus === "ACTIVO";
  const canClose =
    !props.isPeer &&
    props.isStaff &&
    props.status === "MANAGER_COMPLETADA" &&
    props.cycleStatus !== "CERRADO";
  const canManagePip = !props.isPeer && props.isStaff;

  const hasSelf = Object.keys(props.initialSelf.scores).length > 0;
  const hasManager = Object.keys(props.initialManager.scores).length > 0;

  const managerTitle = props.isPeer
    ? `Evaluación de compañero${props.templateName ? ` · ${props.templateName}` : ""}`
    : "Revisión del manager";

  return (
    <div className="space-y-4">
      {/* Autoevaluación — solo en ciclos anuales */}
      {!props.isPeer && (
        <ScoresCard
          title="Autoevaluación del empleado"
          subtitle={
            canSelf
              ? "Completa tu autoevaluación. Tras enviarla no podrás modificarla."
              : hasSelf
                ? "Autoevaluación completada"
                : "Pendiente de completar"
          }
          dimensions={props.dimensions}
          labels={props.labels}
          initialScores={props.initialSelf.scores}
          initialComments={props.initialSelf.comments}
          readOnly={!canSelf}
          action={
            canSelf
              ? async (scores, comments) => {
                  const res = await fetch(
                    `/api/evaluations/${props.evaluationId}?action=self`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        selfScores: scores,
                        selfComments: comments,
                      }),
                    }
                  );
                  if (res.ok) {
                    refresh();
                    return { ok: true };
                  }
                  const j = await res.json().catch(() => ({}));
                  return { ok: false, error: j.error ?? "Error" };
                }
              : undefined
          }
          submitLabel="Enviar autoevaluación"
          submitIcon={<Send className="w-4 h-4" />}
        />
      )}

      {/* Revisión manager / Evaluación del par */}
      {(hasSelf || canManager || hasManager || props.isPeer) && (
        <ScoresCard
          title={managerTitle}
          subtitle={
            canManager
              ? props.isPeer
                ? "Califica a tu compañero. Al enviar queda registrada y no podrás modificarla."
                : "Valora las competencias del empleado. Al enviar se calcula la nota global."
              : hasManager
                ? "Evaluación completada"
                : "Pendiente"
          }
          dimensions={props.dimensions}
          labels={props.labels}
          initialScores={props.initialManager.scores}
          initialComments={props.initialManager.comments}
          initialPipRequired={props.initialManager.pipRequired}
          showPipToggle={!props.isPeer && (canManager || hasManager)}
          readOnly={!canManager}
          action={
            canManager
              ? async (scores, comments, pipRequired) => {
                  const res = await fetch(
                    `/api/evaluations/${props.evaluationId}?action=manager`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        managerScores: scores,
                        managerComments: comments,
                        pipRequired: !!pipRequired,
                      }),
                    }
                  );
                  if (res.ok) {
                    refresh();
                    return { ok: true };
                  }
                  const j = await res.json().catch(() => ({}));
                  return { ok: false, error: j.error ?? "Error" };
                }
              : undefined
          }
          submitLabel={props.isPeer ? "Enviar evaluación" : "Enviar revisión"}
          submitIcon={<Send className="w-4 h-4" />}
        />
      )}

      {/* Cerrar evaluación / indicar PIP — solo ciclos anuales */}
      {canClose && (
        <CloseCard
          evaluationId={props.evaluationId}
          initialPipRequired={props.initialManager.pipRequired}
          onDone={refresh}
        />
      )}

      {/* PIP — solo ciclos anuales */}
      {!props.isPeer && (props.initialPip || canManagePip) && (
        <PipCard
          evaluationId={props.evaluationId}
          canManage={canManagePip}
          initial={props.initialPip}
          onDone={refresh}
        />
      )}
    </div>
  );
}

function ScoresCard({
  title,
  subtitle,
  dimensions,
  labels,
  initialScores,
  initialComments,
  initialPipRequired = false,
  showPipToggle = false,
  readOnly,
  action,
  submitLabel,
  submitIcon,
}: {
  title: string;
  subtitle: string;
  dimensions: string[];
  labels: Record<string, string>;
  initialScores: Scores;
  initialComments: string;
  initialPipRequired?: boolean;
  showPipToggle?: boolean;
  readOnly: boolean;
  action?: (
    scores: Scores,
    comments: string | undefined,
    pipRequired?: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  submitLabel: string;
  submitIcon: React.ReactNode;
}) {
  const [scores, setScores] = useState<Scores>(() => ({ ...initialScores }));
  const [comments, setComments] = useState(initialComments);
  const [pipRequired, setPipRequired] = useState(initialPipRequired);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const average = useMemo(() => {
    const vals = dimensions
      .map((d) => scores[d])
      .filter((v): v is number => typeof v === "number");
    if (vals.length === 0) return 0;
    return (
      Math.round(
        (vals.reduce((a, b) => a + b, 0) / vals.length) * 100
      ) / 100
    );
  }, [dimensions, scores]);

  const allFilled = dimensions.every(
    (d) => typeof scores[d] === "number" && scores[d] >= 1 && scores[d] <= 5
  );

  async function submit() {
    if (!action) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await action(
        scores,
        comments.trim() || undefined,
        pipRequired
      );
      if (!res.ok) setErr(res.error ?? "Error al enviar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-background rounded-xl border border-border p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">
            Promedio
          </p>
          <p className="text-lg font-bold text-foreground">
            {allFilled ? average.toFixed(2) : "—"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {dimensions.map((d) => (
          <div key={d} className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <p className="text-sm font-medium text-foreground">{labels[d]}</p>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((v) => {
                const selected = scores[d] === v;
                return (
                  <button
                    key={v}
                    type="button"
                    disabled={readOnly}
                    onClick={() =>
                      setScores((prev) => ({ ...prev, [d]: v }))
                    }
                    className={`w-8 h-8 rounded-lg border text-sm font-semibold transition ${
                      selected
                        ? "bg-sky-600 border-sky-600 text-white"
                        : "bg-background border-border text-muted-foreground hover:border-sky-300"
                    } ${readOnly ? "opacity-70 cursor-default" : ""}`}
                    title={SCALE_LABELS[v]}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Comentarios
        </label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          disabled={readOnly}
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm disabled:bg-secondary"
          placeholder={
            readOnly
              ? ""
              : "Fortalezas, áreas de mejora, objetivos para el próximo ciclo…"
          }
        />
      </div>

      {showPipToggle && (
        <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={pipRequired}
            onChange={(e) => setPipRequired(e.target.checked)}
            disabled={readOnly}
          />
          <AlertTriangle className="w-4 h-4 text-warning" />
          Se requiere plan de mejora (PIP)
        </label>
      )}

      {err && (
        <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
          {err}
        </div>
      )}

      {action && !readOnly && (
        <div className="mt-4 flex justify-end">
          <button
            disabled={busy || !allFilled}
            onClick={submit}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
          >
            {submitIcon}
            {busy ? "Enviando…" : submitLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function CloseCard({
  evaluationId,
  initialPipRequired,
  onDone,
}: {
  evaluationId: string;
  initialPipRequired: boolean;
  onDone: () => void;
}) {
  const [pipRequired, setPipRequired] = useState(initialPipRequired);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function close() {
    if (!confirm("¿Cerrar esta evaluación? El empleado y el manager no podrán modificarla.")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/evaluations/${evaluationId}?action=close`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pipRequired }),
        }
      );
      if (res.ok) onDone();
      else {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "Error al cerrar");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-secondary rounded-xl border border-border p-4 flex items-center justify-between flex-wrap gap-3">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Cerrar evaluación
        </p>
        <label className="mt-1 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={pipRequired}
            onChange={(e) => setPipRequired(e.target.checked)}
          />
          <AlertTriangle className="w-4 h-4 text-warning" />
          Marcar como requerido plan de mejora (PIP)
        </label>
        {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      </div>
      <button
        disabled={busy}
        onClick={close}
        className="inline-flex items-center gap-2 px-4 py-2 bg-success hover:bg-success/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
      >
        <Lock className="w-4 h-4" />
        {busy ? "Cerrando…" : "Cerrar evaluación"}
      </button>
    </div>
  );
}

function PipCard({
  evaluationId,
  canManage,
  initial,
  onDone,
}: {
  evaluationId: string;
  canManage: boolean;
  initial: {
    objectives: string;
    deadline: string;
    status: "ACTIVO" | "COMPLETADO" | "ARCHIVADO";
    notes: string;
  } | null;
  onDone: () => void;
}) {
  const [objectives, setObjectives] = useState(initial?.objectives ?? "");
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [status, setStatus] = useState<"ACTIVO" | "COMPLETADO" | "ARCHIVADO">(
    initial?.status ?? "ACTIVO"
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const readOnly = !canManage;

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}/pip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectives, deadline, status, notes }),
      });
      if (res.ok) onDone();
      else {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "Error al guardar PIP");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("¿Eliminar el plan de mejora?")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}/pip`, {
        method: "DELETE",
      });
      if (res.ok) onDone();
      else {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "Error al eliminar");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-destructive/10 rounded-xl border border-destructive/20 p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h2 className="text-sm font-semibold text-destructive">
          Plan de mejora (PIP)
        </h2>
        {initial && (
          <span className="ml-auto inline-flex items-center px-2 py-0.5 bg-background border border-destructive/20 rounded-md text-xs font-semibold text-destructive">
            {status}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-destructive mb-1">
            Objetivos de mejora
          </label>
          <textarea
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
            disabled={readOnly}
            rows={4}
            className="w-full px-3 py-2 border border-destructive/20 bg-background rounded-lg text-sm disabled:bg-secondary"
            placeholder="Áreas concretas a mejorar, hitos y resultados esperados…"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-destructive mb-1">
              Fecha límite
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={readOnly}
              className="w-full px-3 py-2 border border-destructive/20 bg-background rounded-lg text-sm disabled:bg-secondary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-destructive mb-1">
              Estado
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as "ACTIVO" | "COMPLETADO" | "ARCHIVADO"
                )
              }
              disabled={readOnly}
              className="w-full px-3 py-2 border border-destructive/20 bg-background rounded-lg text-sm disabled:bg-secondary"
            >
              <option value="ACTIVO">Activo</option>
              <option value="COMPLETADO">Completado</option>
              <option value="ARCHIVADO">Archivado</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-destructive mb-1">
            Notas de seguimiento
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={readOnly}
            rows={3}
            className="w-full px-3 py-2 border border-destructive/20 bg-background rounded-lg text-sm disabled:bg-secondary"
          />
        </div>
      </div>

      {err && (
        <div className="mt-3 p-2 bg-background border border-destructive/30 rounded-lg text-xs text-destructive">
          {err}
        </div>
      )}

      {canManage && (
        <div className="mt-4 flex justify-end gap-2">
          {initial && (
            <button
              disabled={busy}
              onClick={remove}
              className="inline-flex items-center gap-2 px-3 py-2 bg-background border border-destructive/20 hover:bg-destructive/10 text-destructive text-sm font-medium rounded-lg disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          )}
          <button
            disabled={busy || !objectives || !deadline}
            onClick={save}
            className="inline-flex items-center gap-2 px-4 py-2 bg-destructive hover:bg-destructive/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
          >
            <Save className="w-4 h-4" />
            {busy ? "Guardando…" : initial ? "Actualizar PIP" : "Crear PIP"}
          </button>
        </div>
      )}

      {!canManage && initial && (
        <p className="mt-3 text-xs text-destructive flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Plan de mejora gestionado por RRHH.
        </p>
      )}
    </div>
  );
}
