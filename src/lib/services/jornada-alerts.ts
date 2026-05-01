import { db } from "@/lib/db";
import { startOfDay, workedMinutes } from "@/lib/time";

export type JornadaAlert = {
  id: string;
  severity: "warning" | "danger" | "info";
  kind:
    | "OPEN_SHIFT_PAST"
    | "NO_CLOCK_IN_TODAY"
    | "EXCESSIVE_HOURS"
    | "LONG_BREAK"
    | "MISSING_DAY";
  message: string;
  employeeId: string;
  employeeName: string;
  date?: Date;
};

type Options = {
  sedeId?: string | null;
  // Si está definido, limita a reports directos (MANAGER)
  reportsToId?: string | null;
};

// Umbrales
const THRESHOLDS = {
  excessiveMinutes: 10 * 60, // >10h
  longBreakMinutes: 180, // >3h de pausa
  noClockInAfterHour: 11, // si ya pasa de 11:00 y no ha fichado → alerta
};

export async function computeJornadaAlerts(
  opts: Options = {}
): Promise<JornadaAlert[]> {
  const now = new Date();
  const today = startOfDay();
  const alerts: JornadaAlert[] = [];

  // Base de empleados (activos)
  const employees = await db.employee.findMany({
    where: {
      status: "ACTIVE",
      ...(opts.sedeId ? { sedeId: opts.sedeId } : {}),
      ...(opts.reportsToId ? { reportsToId: opts.reportsToId } : {}),
    },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      sedeId: true,
    },
  });
  const empIds = employees.map((e) => e.id);
  const empName = new Map(
    employees.map((e) => [e.id, `${e.apellidos}, ${e.nombres}`])
  );

  if (empIds.length === 0) return alerts;

  // 1) Jornadas abiertas de días anteriores
  const openPast = await db.timeEntry.findMany({
    where: {
      employeeId: { in: empIds },
      date: { lt: today },
      clockOut: null,
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  for (const e of openPast) {
    alerts.push({
      id: `open-${e.id}`,
      severity: "danger",
      kind: "OPEN_SHIFT_PAST",
      message: "Jornada sin cerrar de un día anterior",
      employeeId: e.employeeId,
      employeeName: empName.get(e.employeeId) ?? "—",
      date: e.date,
    });
  }

  // 2) Empleados activos que no han fichado hoy (después de 11:00)
  if (now.getHours() >= THRESHOLDS.noClockInAfterHour) {
    const dow = today.getDay();
    // Lunes-viernes; sábado/domingo ignorados a efectos de "no ha fichado"
    if (dow !== 0 && dow !== 6) {
      // Empleados con fichaje hoy
      const todayEntries = await db.timeEntry.findMany({
        where: {
          employeeId: { in: empIds },
          date: today,
        },
        select: { employeeId: true },
      });
      const fichadoHoy = new Set(todayEntries.map((t) => t.employeeId));

      // Empleados con permiso aprobado hoy (vacaciones, baja, etc.)
      const onLeave = await db.leaveRequest.findMany({
        where: {
          employeeId: { in: empIds },
          status: "APROBADA",
          startDate: { lte: today },
          endDate: { gte: today },
        },
        select: { employeeId: true },
      });
      const deAusencia = new Set(onLeave.map((l) => l.employeeId));

      for (const e of employees) {
        if (!fichadoHoy.has(e.id) && !deAusencia.has(e.id)) {
          alerts.push({
            id: `noin-${e.id}`,
            severity: "warning",
            kind: "NO_CLOCK_IN_TODAY",
            message: "No ha fichado entrada hoy",
            employeeId: e.id,
            employeeName: empName.get(e.id) ?? "—",
            date: today,
          });
        }
      }
    }
  }

  // 3) Jornadas excesivas y pausas largas (últimos 30 días, solo cerradas)
  const last30 = new Date(today);
  last30.setDate(last30.getDate() - 30);

  const closedEntries = await db.timeEntry.findMany({
    where: {
      employeeId: { in: empIds },
      date: { gte: last30, lte: today },
      clockOut: { not: null },
    },
    orderBy: { date: "desc" },
  });

  for (const e of closedEntries) {
    const worked = workedMinutes(e, now);
    if (worked > THRESHOLDS.excessiveMinutes) {
      alerts.push({
        id: `exc-${e.id}`,
        severity: "warning",
        kind: "EXCESSIVE_HOURS",
        message: `Jornada excesiva: ${Math.floor(worked / 60)}h ${worked % 60}m`,
        employeeId: e.employeeId,
        employeeName: empName.get(e.employeeId) ?? "—",
        date: e.date,
      });
    }
    if (e.breakMinutes > THRESHOLDS.longBreakMinutes) {
      alerts.push({
        id: `brk-${e.id}`,
        severity: "info",
        kind: "LONG_BREAK",
        message: `Pausa muy larga: ${Math.floor(e.breakMinutes / 60)}h ${e.breakMinutes % 60}m`,
        employeeId: e.employeeId,
        employeeName: empName.get(e.employeeId) ?? "—",
        date: e.date,
      });
    }
  }

  // Orden: danger → warning → info, y dentro por fecha desc
  const sevOrder = { danger: 0, warning: 1, info: 2 } as const;
  alerts.sort((a, b) => {
    if (sevOrder[a.severity] !== sevOrder[b.severity]) {
      return sevOrder[a.severity] - sevOrder[b.severity];
    }
    const da = a.date?.getTime() ?? 0;
    const dbt = b.date?.getTime() ?? 0;
    return dbt - da;
  });

  return alerts;
}
