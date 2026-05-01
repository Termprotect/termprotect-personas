import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { LEAVE_TYPE_LABELS } from "@/lib/validators/leave-request";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function parseMonth(s: string | undefined): { year: number; month: number } {
  if (s && /^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split("-").map(Number);
    return { year: y, month: m };
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

function toYm(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`;
}

function shiftMonth(y: number, m: number, delta: number) {
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; sede?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role;
  const canSeeAll = ["ADMIN", "RRHH"].includes(role);
  const isManager = role === "MANAGER";
  if (!canSeeAll && !isManager) redirect("/ausencias");

  const sp = await searchParams;
  const { year, month } = parseMonth(sp.month);
  const sedeFilter = sp.sede || "";

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0)); // último día del mes
  const daysInMonth = monthEnd.getUTCDate();

  // Scope de empleados
  const empWhere: Prisma.EmployeeWhereInput = {
    status: { in: ["ACTIVE", "BAJA_MEDICA", "EXCEDENCIA"] },
  };
  if (isManager) empWhere.reportsToId = session.user.id;
  if (sedeFilter) empWhere.sedeId = sedeFilter;

  const employees = await db.employee.findMany({
    where: empWhere,
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      sede: { select: { id: true, name: true } },
    },
  });

  // Solicitudes que tocan el mes
  const requests = await db.leaveRequest.findMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
      status: { in: ["PENDIENTE", "APROBADA"] },
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
    select: {
      id: true,
      employeeId: true,
      type: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  });

  // Festivos por sede en el mes
  const sedes = await db.sede.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const holidays = await db.sedeCalendar.findMany({
    where: {
      sedeId: { in: Array.from(new Set(employees.map((e) => e.sede.id))) },
      date: { gte: monthStart, lte: monthEnd },
    },
    select: { sedeId: true, date: true, description: true },
  });

  // Mapa festivos por sede → set de día del mes
  const holidayBySede = new Map<string, Map<number, string>>();
  for (const h of holidays) {
    const d = h.date.getUTCDate();
    if (!holidayBySede.has(h.sedeId)) holidayBySede.set(h.sedeId, new Map());
    holidayBySede.get(h.sedeId)!.set(d, h.description);
  }

  // Mapa de días ocupados por empleado y día → tipo/estado
  type Cell = {
    type: string;
    typeLabel: string;
    status: "PENDIENTE" | "APROBADA";
  };
  const occupiedByEmployee = new Map<string, Map<number, Cell>>();
  for (const r of requests) {
    const from = new Date(
      Math.max(r.startDate.getTime(), monthStart.getTime())
    );
    const to = new Date(Math.min(r.endDate.getTime(), monthEnd.getTime()));
    const cur = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
    );
    while (cur.getTime() <= to.getTime()) {
      const dom = cur.getUTCDate();
      if (!occupiedByEmployee.has(r.employeeId)) {
        occupiedByEmployee.set(r.employeeId, new Map());
      }
      const emp = occupiedByEmployee.get(r.employeeId)!;
      if (!emp.has(dom)) {
        emp.set(dom, {
          type: r.type,
          typeLabel: LEAVE_TYPE_LABELS[r.type] ?? r.type,
          status: r.status as "PENDIENTE" | "APROBADA",
        });
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weekendSet = new Set<number>();
  for (const d of daysArr) {
    const dow = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
    if (dow === 0 || dow === 6) weekendSet.add(d);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/ausencias"
          className="text-muted-foreground hover:text-muted-foreground text-sm"
        >
          ← Volver
        </Link>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Calendario del equipo
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isManager
              ? "Tu equipo directo"
              : `Toda la organización${sedeFilter ? ` · filtrada por sede` : ""}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/ausencias/calendario?month=${toYm(prev.y, prev.m)}${
              sedeFilter ? `&sede=${sedeFilter}` : ""
            }`}
            className="p-2 bg-background border border-border rounded-lg hover:bg-secondary"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-semibold text-foreground min-w-[160px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </div>
          <Link
            href={`/ausencias/calendario?month=${toYm(next.y, next.m)}${
              sedeFilter ? `&sede=${sedeFilter}` : ""
            }`}
            className="p-2 bg-background border border-border rounded-lg hover:bg-secondary"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {canSeeAll && (
        <div className="bg-background rounded-xl border border-border p-4">
          <form className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="month" value={toYm(year, month)} />
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Sede
              </label>
              <select
                name="sede"
                defaultValue={sedeFilter}
                className="px-3 py-1.5 border border-border rounded-lg text-sm min-w-[160px]"
              >
                <option value="">Todas</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
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
          </form>
        </div>
      )}

      {/* Leyenda */}
      <div className="flex items-center flex-wrap gap-3 text-[11px]">
        <LegendBox color="bg-info/20" label="Vacaciones aprobadas" />
        <LegendBox color="bg-info/10 border border-border" label="Vacaciones pendientes" />
        <LegendBox color="bg-warning/20" label="Permiso aprobado" />
        <LegendBox color="bg-warning/10 border border-warning/20" label="Permiso pendiente" />
        <LegendBox color="bg-destructive/20" label="IT / Excedencia" />
        <LegendBox color="bg-destructive/10" label="Festivo" />
        <LegendBox color="bg-muted" label="Fin de semana" />
      </div>

      {/* Tabla */}
      <div className="bg-background rounded-xl border border-border overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-secondary border-b border-border">
              <th className="sticky left-0 bg-secondary text-left px-3 py-2 font-semibold text-muted-foreground min-w-[200px] z-10">
                Empleado
              </th>
              {daysArr.map((d) => {
                const dow = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
                const isWe = dow === 0 || dow === 6;
                return (
                  <th
                    key={d}
                    className={`text-center w-7 font-semibold ${
                      isWe ? "text-muted-foreground bg-muted" : "text-muted-foreground"
                    }`}
                  >
                    {d}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => {
              const empHolidays = holidayBySede.get(e.sede.id) ?? new Map();
              const occupied = occupiedByEmployee.get(e.id) ?? new Map();
              return (
                <tr key={e.id} className="border-b border-border hover:bg-secondary/50">
                  <td className="sticky left-0 bg-background text-left px-3 py-1.5 font-medium text-foreground z-10 border-r border-border">
                    <div className="truncate">
                      {e.apellidos}, {e.nombres}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{e.sede.name}</div>
                  </td>
                  {daysArr.map((d) => {
                    const isWe = weekendSet.has(d);
                    const holidayDesc = empHolidays.get(d);
                    const cell = occupied.get(d);
                    let bg = "";
                    let label = "";
                    if (cell) {
                      label = `${cell.typeLabel} (${cell.status.toLowerCase()})`;
                      if (cell.type === "VACACIONES") {
                        bg =
                          cell.status === "APROBADA"
                            ? "bg-info/30"
                            : "bg-info/10 border border-border";
                      } else if (
                        cell.type === "INCAPACIDAD_TEMPORAL" ||
                        cell.type.startsWith("EXCEDENCIA")
                      ) {
                        bg =
                          cell.status === "APROBADA"
                            ? "bg-destructive/30"
                            : "bg-destructive/10 border border-destructive/20";
                      } else {
                        bg =
                          cell.status === "APROBADA"
                            ? "bg-warning/30"
                            : "bg-warning/10 border border-warning/20";
                      }
                    } else if (holidayDesc) {
                      bg = "bg-destructive/10";
                      label = `Festivo: ${holidayDesc}`;
                    } else if (isWe) {
                      bg = "bg-muted";
                      label = "Fin de semana";
                    }
                    return (
                      <td
                        key={d}
                        className={`h-7 w-7 border-r border-border ${bg}`}
                        title={label || `${d} ${MONTH_NAMES[month - 1]}`}
                      />
                    );
                  })}
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr>
                <td colSpan={daysInMonth + 1} className="p-8 text-center text-muted-foreground">
                  No hay empleados en este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LegendBox({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block w-4 h-4 rounded ${color}`} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
