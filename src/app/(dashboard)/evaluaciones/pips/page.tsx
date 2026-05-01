import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PIP_STATUS_LABELS } from "@/lib/validators/evaluation";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PIP_COLOR: Record<string, string> = {
  ACTIVO: "bg-destructive/10 text-destructive border-destructive/20",
  COMPLETADO: "bg-success/10 text-success border-success/20",
  ARCHIVADO: "bg-muted text-muted-foreground border-border",
};

const fmt = (d: Date) => d.toISOString().slice(0, 10).split("-").reverse().join("/");

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  const userId = session.user.id;
  const isStaff = role === "ADMIN" || role === "RRHH";
  const isManager = role === "MANAGER";
  if (!isStaff && !isManager) redirect("/evaluaciones");

  const sp = await searchParams;
  const statusFilter = sp.status ?? "ACTIVO";

  const where: Prisma.ImprovementPlanWhereInput = {
    ...(statusFilter === "TODOS" ? {} : { status: statusFilter }),
    ...(isStaff
      ? {}
      : {
          evaluation: { employee: { reportsToId: userId } },
        }),
  };

  const pips = await db.improvementPlan.findMany({
    where,
    orderBy: [{ deadline: "asc" }],
    include: {
      evaluation: {
        include: {
          cycle: { select: { id: true, name: true } },
          employee: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              position: true,
              sede: { select: { name: true } },
            },
          },
          evaluator: { select: { nombres: true, apellidos: true } },
        },
      },
    },
  });

  const today = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + 14);

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
          <h1 className="text-2xl font-bold text-foreground">Planes de mejora</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isStaff
              ? "Todos los planes de mejora de la plantilla."
              : "Planes de mejora de empleados a tu cargo."}
          </p>
        </div>
        <form className="flex items-end gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Estado
            </label>
            <select
              name="status"
              defaultValue={statusFilter}
              className="px-3 py-1.5 border border-border rounded-lg text-sm"
            >
              <option value="ACTIVO">Activos</option>
              <option value="COMPLETADO">Completados</option>
              <option value="ARCHIVADO">Archivados</option>
              <option value="TODOS">Todos</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg"
          >
            Filtrar
          </button>
        </form>
      </div>

      {pips.length === 0 ? (
        <div className="bg-background rounded-xl border border-dashed border-border p-10 text-center">
          <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">
            No hay planes de mejora con este filtro.
          </p>
        </div>
      ) : (
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Empleado</th>
                  <th className="px-4 py-2 text-left">Ciclo</th>
                  <th className="px-4 py-2 text-left">Evaluador</th>
                  <th className="px-4 py-2 text-left">Fecha límite</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pips.map((p) => {
                  const overdue =
                    p.status === "ACTIVO" && p.deadline < today;
                  const near =
                    p.status === "ACTIVO" &&
                    !overdue &&
                    p.deadline <= soon;
                  return (
                    <tr key={p.id} className="hover:bg-secondary">
                      <td className="px-4 py-2">
                        <p className="font-medium text-foreground">
                          {p.evaluation.employee.apellidos},{" "}
                          {p.evaluation.employee.nombres}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.evaluation.employee.position ?? "—"}
                          {p.evaluation.employee.sede?.name
                            ? ` · ${p.evaluation.employee.sede.name}`
                            : ""}
                        </p>
                      </td>
                      <td className="px-4 py-2 text-foreground text-xs">
                        {p.evaluation.cycle.name}
                      </td>
                      <td className="px-4 py-2 text-foreground text-xs">
                        {p.evaluation.evaluator.apellidos},{" "}
                        {p.evaluation.evaluator.nombres}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            overdue
                              ? "text-destructive"
                              : near
                                ? "text-warning"
                                : "text-foreground"
                          }`}
                        >
                          <CalendarClock className="w-3 h-3" />
                          {fmt(p.deadline)}
                          {overdue && " (vencido)"}
                          {near && " (próximo)"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 border rounded-md text-xs font-semibold ${PIP_COLOR[p.status]}`}
                        >
                          {PIP_STATUS_LABELS[
                            p.status as keyof typeof PIP_STATUS_LABELS
                          ] ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={`/evaluaciones/${p.evaluationId}`}
                          className="text-accent font-semibold hover:text-accent text-sm"
                        >
                          Abrir →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
