import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  EVAL_STATUS_LABELS,
  EVAL_CYCLE_STATUS_LABELS,
} from "@/lib/validators/evaluation";
import {
  Star,
  Users,
  ClipboardList,
  AlertTriangle,
  Plus,
  FileText,
} from "lucide-react";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  PENDIENTE: "bg-muted text-foreground border-border",
  AUTOEVALUACION_COMPLETADA: "bg-sky-50 text-sky-700 border-sky-200",
  MANAGER_COMPLETADA: "bg-warning/10 text-warning border-warning/20",
  CERRADA: "bg-success/10 text-success border-success/20",
};

const CYCLE_STATUS_COLOR: Record<string, string> = {
  BORRADOR: "bg-muted text-foreground border-border",
  ACTIVO: "bg-success/10 text-success border-success/20",
  CERRADO: "bg-secondary text-muted-foreground border-border",
};

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  const userId = session.user.id;
  const isStaff = role === "ADMIN" || role === "RRHH";
  const isManager = role === "MANAGER";

  const myWhere: Prisma.EvaluationWhereInput = {
    OR: [{ employeeId: userId }, { evaluatorId: userId }],
  };

  const [myEvals, activeCycles, pipCount] = await Promise.all([
    db.evaluation.findMany({
      where: myWhere,
      orderBy: [{ updatedAt: "desc" }],
      take: 30,
      include: {
        cycle: { select: { id: true, name: true, status: true, kind: true } },
        employee: {
          select: { id: true, nombres: true, apellidos: true, position: true },
        },
        evaluator: { select: { id: true, nombres: true, apellidos: true } },
        template: { select: { id: true, name: true } },
      },
    }),
    db.evalCycle.findMany({
      where: { status: "ACTIVO" },
      orderBy: [{ startDate: "desc" }],
      include: { _count: { select: { evaluations: true } } },
    }),
    isStaff || isManager
      ? db.improvementPlan.count({ where: { status: "ACTIVO" } })
      : Promise.resolve(0),
  ]);

  const asEmployee = myEvals.filter((e) => e.employeeId === userId);
  const asEvaluator = myEvals.filter((e) => e.evaluatorId === userId);

  const pending = {
    self: asEmployee.filter(
      (e) =>
        e.status === "PENDIENTE" &&
        e.cycle.status === "ACTIVO" &&
        e.evaluatorType !== "PEER"
    ).length,
    manager: asEvaluator.filter(
      (e) =>
        e.cycle.status === "ACTIVO" &&
        ((e.evaluatorType === "PEER" && e.status === "PENDIENTE") ||
          (e.evaluatorType !== "PEER" &&
            e.status === "AUTOEVALUACION_COMPLETADA"))
    ).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Evaluación del desempeño</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Autoevaluación, revisión del manager y planes de mejora.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(isStaff || isManager) && (
            <Link
              href="/evaluaciones/pips"
              className="inline-flex items-center gap-2 px-3 py-2 bg-background border border-border hover:bg-secondary text-foreground text-sm font-medium rounded-lg"
            >
              <AlertTriangle className="w-4 h-4" />
              Planes de mejora
            </Link>
          )}
          {isStaff && (
            <>
              <Link
                href="/evaluaciones/plantillas"
                className="inline-flex items-center gap-2 px-3 py-2 bg-background border border-border hover:bg-secondary text-foreground text-sm font-medium rounded-lg"
              >
                <FileText className="w-4 h-4" />
                Plantillas
              </Link>
              <Link
                href="/evaluaciones/ciclos"
                className="inline-flex items-center gap-2 px-3 py-2 bg-background border border-border hover:bg-secondary text-foreground text-sm font-medium rounded-lg"
              >
                <ClipboardList className="w-4 h-4" />
                Ciclos
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          icon={<Star className="w-4 h-4 text-sky-600" />}
          label="Mis evaluaciones"
          value={asEmployee.length}
        />
        <Stat
          icon={<Users className="w-4 h-4 text-warning" />}
          label="Para mí como evaluador"
          value={asEvaluator.length}
        />
        <Stat
          icon={<ClipboardList className="w-4 h-4 text-success" />}
          label="Ciclos activos"
          value={activeCycles.length}
        />
        {(isStaff || isManager) && (
          <Stat
            icon={<AlertTriangle className="w-4 h-4 text-destructive" />}
            label="PIPs activos"
            value={pipCount}
          />
        )}
      </div>

      {(pending.self > 0 || pending.manager > 0) && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 text-sm text-warning">
          <p className="font-semibold">Tienes tareas pendientes</p>
          <ul className="list-disc list-inside mt-1 text-warning">
            {pending.self > 0 && (
              <li>
                {pending.self} autoevaluación{pending.self > 1 ? "es" : ""} por completar
              </li>
            )}
            {pending.manager > 0 && (
              <li>
                {pending.manager} revisión{pending.manager > 1 ? "es" : ""} como evaluador
              </li>
            )}
          </ul>
        </div>
      )}

      {activeCycles.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">Ciclos activos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {activeCycles.map((c) => (
              <div
                key={c.id}
                className="bg-background rounded-xl border border-border p-4"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="font-semibold text-foreground">{c.name}</p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 border rounded-md text-xs font-semibold ${CYCLE_STATUS_COLOR[c.status]}`}
                  >
                    {EVAL_CYCLE_STATUS_LABELS[c.status]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.startDate.toISOString().slice(0, 10)} →{" "}
                  {c.endDate.toISOString().slice(0, 10)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {c._count.evaluations} evaluaciones
                </p>
                {isStaff && (
                  <Link
                    href={`/evaluaciones/ciclos/${c.id}`}
                    className="inline-block mt-3 text-xs text-sky-700 font-semibold hover:text-sky-800"
                  >
                    Ver detalle →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {asEmployee.length > 0 && (
        <EvalSection
          title="Mis evaluaciones"
          whoLabel="Evaluador"
          rows={asEmployee.map((e) => ({
            id: e.id,
            who: `${e.evaluator.apellidos}, ${e.evaluator.nombres}`,
            cycleName: e.cycle.name,
            cycleStatus: e.cycle.status,
            status: e.status,
            overallScore: e.overallScore,
          }))}
        />
      )}

      {asEvaluator.length > 0 && (
        <EvalSection
          title="Evaluaciones de mi equipo"
          whoLabel="Empleado"
          rows={asEvaluator.map((e) => ({
            id: e.id,
            who: `${e.employee.apellidos}, ${e.employee.nombres}`,
            cycleName: e.cycle.name,
            cycleStatus: e.cycle.status,
            status: e.status,
            overallScore: e.overallScore,
          }))}
        />
      )}

      {myEvals.length === 0 && (
        <div className="bg-background rounded-xl border border-dashed border-border p-10 text-center">
          <Star className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">
            Todavía no tienes evaluaciones asignadas.
          </p>
          {isStaff && (
            <Link
              href="/evaluaciones/ciclos"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Crear primer ciclo
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function EvalSection({
  title,
  whoLabel,
  rows,
}: {
  title: string;
  whoLabel: string;
  rows: {
    id: string;
    who: string;
    cycleName: string;
    cycleStatus: string;
    status: string;
    overallScore: number | null;
  }[];
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-2">{title}</h2>
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Ciclo</th>
                <th className="px-4 py-2 text-left">{whoLabel}</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Nota global</th>
                <th className="px-4 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-secondary">
                  <td className="px-4 py-2">
                    <p className="font-medium text-foreground">{r.cycleName}</p>
                    <p className="text-xs text-muted-foreground">
                      {EVAL_CYCLE_STATUS_LABELS[
                        r.cycleStatus as keyof typeof EVAL_CYCLE_STATUS_LABELS
                      ]}
                    </p>
                  </td>
                  <td className="px-4 py-2 text-foreground">{r.who}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 border rounded-md text-xs font-semibold ${STATUS_COLOR[r.status]}`}
                    >
                      {EVAL_STATUS_LABELS[
                        r.status as keyof typeof EVAL_STATUS_LABELS
                      ]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-foreground">
                    {r.overallScore != null ? r.overallScore.toFixed(2) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/evaluaciones/${r.id}`}
                      className="text-sky-700 font-semibold hover:text-sky-800 text-sm"
                    >
                      Abrir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-[11px] uppercase tracking-wide font-semibold">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
