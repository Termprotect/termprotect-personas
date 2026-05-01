import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  EVAL_CYCLE_STATUS_LABELS,
  EVAL_STATUS_LABELS,
} from "@/lib/validators/evaluation";
import CicloDetalleClient from "./CicloDetalleClient";

export const dynamic = "force-dynamic";

const CYCLE_STATUS_COLOR: Record<string, string> = {
  BORRADOR: "bg-muted text-foreground border-border",
  ACTIVO: "bg-success/10 text-success border-success/20",
  CERRADO: "bg-secondary text-muted-foreground border-border",
};

const STATUS_COLOR: Record<string, string> = {
  PENDIENTE: "bg-muted text-foreground border-border",
  AUTOEVALUACION_COMPLETADA: "bg-accent/15 text-accent border-accent/30",
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
  if (!["ADMIN", "RRHH"].includes(session.user.role)) redirect("/evaluaciones");

  const { id } = await params;
  const [cycle, sedes, templates, evaluables] = await Promise.all([
    db.evalCycle.findUnique({
      where: { id },
      include: {
        evaluations: {
          orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
          include: {
            employee: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                position: true,
                sede: { select: { name: true } },
                department: true,
              },
            },
            evaluator: {
              select: { id: true, nombres: true, apellidos: true },
            },
            template: { select: { id: true, name: true } },
            improvementPlan: { select: { id: true, status: true } },
          },
        },
      },
    }),
    db.sede.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.evalTemplate.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        questions: true,
      },
    }),
    db.employee.findMany({
      where: { status: { in: ["ACTIVE", "BAJA_MEDICA", "EXCEDENCIA"] } },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        position: true,
        department: true,
        sede: { select: { id: true, name: true } },
      },
    }),
  ]);
  if (!cycle) notFound();

  const stats = {
    total: cycle.evaluations.length,
    pendiente: 0,
    auto: 0,
    manager: 0,
    cerrada: 0,
    pips: 0,
  };
  for (const e of cycle.evaluations) {
    if (e.status === "PENDIENTE") stats.pendiente++;
    else if (e.status === "AUTOEVALUACION_COMPLETADA") stats.auto++;
    else if (e.status === "MANAGER_COMPLETADA") stats.manager++;
    else if (e.status === "CERRADA") stats.cerrada++;
    if (e.improvementPlan) stats.pips++;
  }
  const pct =
    stats.total > 0 ? Math.round((stats.cerrada / stats.total) * 100) : 0;

  const rows = cycle.evaluations.map((e) => ({
    id: e.id,
    employeeId: e.employee.id,
    employeeName: `${e.employee.apellidos}, ${e.employee.nombres}`,
    employeePosition: e.employee.position ?? "",
    employeeSede: e.employee.sede?.name ?? "",
    employeeDepartment: e.employee.department ?? "",
    evaluatorId: e.evaluator.id,
    evaluatorName: `${e.evaluator.apellidos}, ${e.evaluator.nombres}`,
    evaluatorType: e.evaluatorType,
    templateId: e.templateId,
    templateName: e.template?.name ?? null,
    status: e.status,
    statusLabel: EVAL_STATUS_LABELS[e.status],
    statusColor: STATUS_COLOR[e.status],
    overallScore: e.overallScore,
    pip: e.improvementPlan
      ? { id: e.improvementPlan.id, status: e.improvementPlan.status }
      : null,
  }));

  const templatesLite = templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    questionCount: Array.isArray(t.questions) ? (t.questions as unknown[]).length : 0,
  }));

  const employeesLite = evaluables.map((e) => ({
    id: e.id,
    name: `${e.apellidos}, ${e.nombres}`,
    position: e.position ?? "",
    department: e.department ?? "",
    sedeName: e.sede?.name ?? "",
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/evaluaciones/ciclos"
          className="text-muted-foreground hover:text-muted-foreground text-sm"
        >
          ← Volver
        </Link>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-foreground">{cycle.name}</h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 border rounded-md text-xs font-semibold ${CYCLE_STATUS_COLOR[cycle.status]}`}
            >
              {EVAL_CYCLE_STATUS_LABELS[cycle.status]}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 border rounded-md text-[11px] font-semibold ${
                cycle.kind === "MONTHLY_PEER"
                  ? "bg-info/10 text-primary border-border"
                  : "bg-accent/15 text-accent border-accent/30"
              }`}
            >
              {cycle.kind === "MONTHLY_PEER" ? "Pares" : "Anual"}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            {cycle.startDate.toISOString().slice(0, 10)} →{" "}
            {cycle.endDate.toISOString().slice(0, 10)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Total" value={stats.total} />
        <Stat label="Pendientes" value={stats.pendiente} accent="slate" />
        <Stat label="Autoeval." value={stats.auto} accent="sky" />
        <Stat label="Rev. manager" value={stats.manager} accent="amber" />
        <Stat label="Cerradas" value={stats.cerrada} accent="emerald" />
        <Stat label="PIPs" value={stats.pips} accent="rose" />
      </div>

      <div className="bg-background rounded-xl border border-border p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Progreso</span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-success"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <CicloDetalleClient
        cycleId={cycle.id}
        cycleStatus={cycle.status}
        cycleKind={cycle.kind}
        sedes={sedes}
        rows={rows}
        templates={templatesLite}
        employees={employeesLite}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "slate" | "sky" | "amber" | "emerald" | "rose";
}) {
  const color = {
    slate: "text-foreground",
    sky: "text-accent",
    amber: "text-warning",
    emerald: "text-success",
    rose: "text-destructive",
  }[accent ?? "slate"];
  return (
    <div className="bg-background rounded-xl border border-border p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
        {label}
      </p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
