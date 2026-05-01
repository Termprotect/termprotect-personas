import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  MANDATORY_TYPE_LABELS,
} from "@/lib/validators/training";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Minus,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

type CellStatus = "COMPLETADO" | "INSCRITO" | "NO_ASISTIO" | "CANCELADO" | "FALTA";

const EMPLOYEE_ACTIVE_STATUS = ["ACTIVE", "BAJA_MEDICA", "EXCEDENCIA"] as const;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string; type?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "RRHH"].includes(session.user.role)) redirect("/formacion");

  const sp = await searchParams;
  const sedeFilter = sp.sede ?? "";
  const typeFilter = sp.type ?? "";

  const [sedes, trainings, employees] = await Promise.all([
    db.sede.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.training.findMany({
      where: {
        mandatory: true,
        ...(typeFilter ? { mandatoryType: typeFilter } : {}),
      },
      orderBy: [{ mandatoryType: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        mandatoryType: true,
      },
    }),
    db.employee.findMany({
      where: {
        status: { in: [...EMPLOYEE_ACTIVE_STATUS] },
        ...(sedeFilter ? { sedeId: sedeFilter } : {}),
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        position: true,
        sede: { select: { id: true, name: true } },
      },
    }),
  ]);

  // Mapa enrollments: employeeId -> trainingId -> status
  const enrollments = await db.trainingEnrollment.findMany({
    where: {
      trainingId: { in: trainings.map((t) => t.id) },
      employeeId: { in: employees.map((e) => e.id) },
    },
    select: {
      employeeId: true,
      trainingId: true,
      status: true,
    },
  });

  const byEmp = new Map<string, Map<string, CellStatus>>();
  for (const e of enrollments) {
    if (!byEmp.has(e.employeeId)) byEmp.set(e.employeeId, new Map());
    byEmp.get(e.employeeId)!.set(e.trainingId, e.status as CellStatus);
  }

  // Totales de cumplimiento
  const totalCells = employees.length * trainings.length;
  let completed = 0;
  let pending = 0;
  let missing = 0;
  for (const emp of employees) {
    const row = byEmp.get(emp.id);
    for (const t of trainings) {
      const s = row?.get(t.id);
      if (s === "COMPLETADO") completed++;
      else if (s === "INSCRITO") pending++;
      else missing++;
    }
  }

  const pct = totalCells > 0 ? Math.round((completed / totalCells) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/formacion"
          className="text-muted-foreground hover:text-muted-foreground text-sm"
        >
          ← Volver
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Matriz de formaciones obligatorias
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cumplimiento por empleado y formación obligatoria (PRL, RGPD, Igualdad…).
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Cumplimiento" value={`${pct}%`} accent="emerald" />
        <Stat label="Completadas" value={String(completed)} accent="emerald" />
        <Stat label="En curso" value={String(pending)} accent="amber" />
        <Stat label="Faltantes" value={String(missing)} accent="rose" />
      </div>

      <form className="bg-background rounded-xl border border-border p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
            Sede
          </label>
          <select
            name="sede"
            defaultValue={sedeFilter}
            className="px-3 py-1.5 border border-border rounded-lg text-sm min-w-[160px]"
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
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
            Tipo
          </label>
          <select
            name="type"
            defaultValue={typeFilter}
            className="px-3 py-1.5 border border-border rounded-lg text-sm min-w-[160px]"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(MANDATORY_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg"
        >
          Filtrar
        </button>
        {(sedeFilter || typeFilter) && (
          <Link
            href="/formacion/obligatorias"
            className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg"
          >
            Limpiar
          </Link>
        )}
      </form>

      {trainings.length === 0 ? (
        <div className="bg-background rounded-xl border border-dashed border-border p-10 text-center">
          <ShieldAlert className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">
            No hay formaciones obligatorias registradas.
          </p>
          <Link
            href="/formacion/nueva"
            className="inline-block mt-3 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg"
          >
            Crear formación obligatoria
          </Link>
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-background rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">No hay empleados para esta sede.</p>
        </div>
      ) : (
        <>
          <Legend />
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead className="bg-secondary">
                  <tr>
                    <th className="sticky left-0 z-10 bg-secondary px-3 py-2 text-left text-muted-foreground border-r border-border min-w-[220px]">
                      Empleado
                    </th>
                    {trainings.map((t) => (
                      <th
                        key={t.id}
                        className="px-2 py-2 border-l border-border text-muted-foreground align-bottom"
                        style={{ minWidth: 80, maxWidth: 110 }}
                        title={t.title}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 bg-destructive/10 text-destructive border border-destructive/20 rounded text-[9px] font-semibold"
                            title={t.mandatoryType ?? ""}
                          >
                            {t.mandatoryType
                              ? (MANDATORY_TYPE_LABELS[
                                  t.mandatoryType as keyof typeof MANDATORY_TYPE_LABELS
                                ] ?? t.mandatoryType)
                              : "OBL"}
                          </span>
                          <Link
                            href={`/formacion/${t.id}`}
                            className="font-semibold text-foreground hover:text-sky-700 line-clamp-2 text-[10px]"
                          >
                            {t.title}
                          </Link>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employees.map((emp) => {
                    const row = byEmp.get(emp.id);
                    const rowMissing = trainings.some((t) => {
                      const s = row?.get(t.id);
                      return !s || s === "FALTA" || s === "CANCELADO" || s === "NO_ASISTIO";
                    });
                    return (
                      <tr key={emp.id} className="hover:bg-secondary">
                        <td className="sticky left-0 z-10 bg-background hover:bg-secondary px-3 py-2 border-r border-border">
                          <div className="flex items-center gap-1">
                            {rowMissing && (
                              <AlertTriangle
                                className="w-3 h-3 text-warning shrink-0"
                                aria-label="Faltan obligatorias"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                {emp.apellidos}, {emp.nombres}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {[emp.position, emp.sede?.name]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                          </div>
                        </td>
                        {trainings.map((t) => {
                          const s = row?.get(t.id);
                          return (
                            <td
                              key={t.id}
                              className="px-2 py-2 text-center border-l border-border"
                            >
                              <Cell status={s} />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Cell({ status }: { status: CellStatus | undefined }) {
  if (status === "COMPLETADO") {
    return (
      <span
        title="Completado"
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/10 text-success"
      >
        <CheckCircle2 className="w-4 h-4" />
      </span>
    );
  }
  if (status === "INSCRITO") {
    return (
      <span
        title="Inscrito (en curso)"
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700"
      >
        <Clock className="w-4 h-4" />
      </span>
    );
  }
  if (status === "NO_ASISTIO") {
    return (
      <span
        title="No asistió"
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-warning/10 text-warning"
      >
        <XCircle className="w-4 h-4" />
      </span>
    );
  }
  if (status === "CANCELADO") {
    return (
      <span
        title="Cancelado"
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground"
      >
        <Minus className="w-4 h-4" />
      </span>
    );
  }
  // Falta: no inscrito
  return (
    <span
      title="No inscrito"
      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-destructive/10 text-destructive border border-destructive/20"
    >
      <Minus className="w-4 h-4" />
    </span>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-success/10 text-success">
          <CheckCircle2 className="w-3 h-3" />
        </span>
        Completado
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-100 text-sky-700">
          <Clock className="w-3 h-3" />
        </span>
        Inscrito
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-warning/10 text-warning">
          <XCircle className="w-3 h-3" />
        </span>
        No asistió
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-muted-foreground">
          <Minus className="w-3 h-3" />
        </span>
        Cancelado
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
          <Minus className="w-3 h-3" />
        </span>
        No inscrito
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "emerald" | "amber" | "rose";
}) {
  const bg = {
    emerald: "bg-success/10 text-success",
    amber: "bg-warning/10 text-warning",
    rose: "bg-destructive/10 text-destructive",
  }[accent];
  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">
        {label}
      </p>
      <p className={`text-xl font-bold ${bg.split(" ")[1]}`}>{value}</p>
    </div>
  );
}
