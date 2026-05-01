import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  EVAL_CYCLE_STATUS_LABELS,
  EVAL_STATUS_LABELS,
  EVAL_DIMENSIONS,
  EVAL_DIMENSION_LABELS,
} from "@/lib/validators/evaluation";
import EvaluacionClient from "./EvaluacionClient";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  PENDIENTE: "bg-muted text-foreground border-border",
  AUTOEVALUACION_COMPLETADA: "bg-sky-50 text-sky-700 border-sky-200",
  MANAGER_COMPLETADA: "bg-warning/10 text-warning border-warning/20",
  CERRADA: "bg-success/10 text-success border-success/20",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const role = session.user.role;
  const userId = session.user.id;
  const isStaff = role === "ADMIN" || role === "RRHH";

  const ev = await db.evaluation.findUnique({
    where: { id },
    include: {
      cycle: true,
      employee: {
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          position: true,
          department: true,
          sede: { select: { name: true } },
        },
      },
      evaluator: {
        select: { id: true, nombres: true, apellidos: true },
      },
      template: {
        select: { id: true, name: true, description: true, questions: true },
      },
      improvementPlan: true,
    },
  });
  if (!ev) notFound();

  const isOwner = ev.employeeId === userId;
  const isEvaluator = ev.evaluatorId === userId;
  if (!isStaff && !isOwner && !isEvaluator) redirect("/evaluaciones");

  const selfScores = (ev.selfScores ?? {}) as Record<string, number>;
  const managerScores = (ev.managerScores ?? {}) as Record<string, number>;

  // Si hay plantilla, usamos sus preguntas como dimensiones dinámicas
  type Q = { id: string; label: string; help?: string };
  const templateQuestions: Q[] = ev.template
    ? ((ev.template.questions as Q[]) ?? [])
    : [];
  const dims: string[] = templateQuestions.length
    ? templateQuestions.map((q) => q.id)
    : [...EVAL_DIMENSIONS];
  const labs: Record<string, string> = templateQuestions.length
    ? Object.fromEntries(templateQuestions.map((q) => [q.id, q.label]))
    : EVAL_DIMENSION_LABELS;
  const isPeer = ev.evaluatorType === "PEER";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/evaluaciones"
          className="text-muted-foreground hover:text-muted-foreground text-sm"
        >
          ← Volver
        </Link>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-foreground">
              {ev.employee.apellidos}, {ev.employee.nombres}
            </h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 border rounded-md text-xs font-semibold ${STATUS_COLOR[ev.status]}`}
            >
              {EVAL_STATUS_LABELS[ev.status]}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            {ev.employee.position ?? "—"}
            {ev.employee.sede?.name ? ` · ${ev.employee.sede.name}` : ""}
            {ev.employee.department ? ` · ${ev.employee.department}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
            Ciclo
          </p>
          <p className="text-sm font-medium text-foreground">{ev.cycle.name}</p>
          <p className="text-xs text-muted-foreground">
            {EVAL_CYCLE_STATUS_LABELS[ev.cycle.status]} ·{" "}
            {ev.cycle.startDate.toISOString().slice(0, 10)} →{" "}
            {ev.cycle.endDate.toISOString().slice(0, 10)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <InfoBlock label="Empleado" value={`${ev.employee.apellidos}, ${ev.employee.nombres}`} />
        <InfoBlock
          label="Evaluador"
          value={`${ev.evaluator.apellidos}, ${ev.evaluator.nombres}`}
        />
        <InfoBlock
          label="Nota global"
          value={
            ev.overallScore != null
              ? `${ev.overallScore.toFixed(2)} / 5`
              : "Sin calificar"
          }
        />
      </div>

      <EvaluacionClient
        evaluationId={ev.id}
        cycleStatus={ev.cycle.status}
        cycleKind={ev.cycle.kind}
        status={ev.status}
        isOwner={isOwner}
        isEvaluator={isEvaluator}
        isStaff={isStaff}
        isPeer={isPeer}
        templateName={ev.template?.name ?? null}
        dimensions={dims}
        labels={labs}
        initialSelf={{
          scores: selfScores,
          comments: ev.selfComments ?? "",
        }}
        initialManager={{
          scores: managerScores,
          comments: ev.managerComments ?? "",
          pipRequired: ev.pipRequired,
        }}
        initialPip={
          ev.improvementPlan
            ? {
                objectives: ev.improvementPlan.objectives,
                deadline: ev.improvementPlan.deadline
                  .toISOString()
                  .slice(0, 10),
                status: ev.improvementPlan.status as
                  | "ACTIVO"
                  | "COMPLETADO"
                  | "ARCHIVADO",
                notes: ev.improvementPlan.notes ?? "",
              }
            : null
        }
      />
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
