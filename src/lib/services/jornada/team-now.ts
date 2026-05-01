import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface TeamCounts {
  trabajando: number;
  enPausa: number;
  sinFichar: number;
  vacIt: number;
}

export interface RecentClock {
  id: string;
  employeeName: string;
  sedeName: string | null;
  clockIn: Date;
  clockOut: Date | null;
}

export interface TeamNowResult {
  counts: TeamCounts;
  recent: RecentClock[];
  totalActive: number;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

export async function getTeamNow(
  scope: Prisma.EmployeeWhereInput = {},
  now: Date = new Date(),
): Promise<TeamNowResult> {
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const [activeEmployees, todayEntries, todayLeaves, recent] = await Promise.all([
    db.employee.findMany({
      where: { ...scope, status: "ACTIVE" },
      select: { id: true },
    }),
    db.timeEntry.findMany({
      where: {
        date: { gte: dayStart, lte: dayEnd },
        employee: { ...scope, status: "ACTIVE" },
      },
      orderBy: { clockIn: "desc" },
      select: {
        id: true,
        employeeId: true,
        clockIn: true,
        clockOut: true,
      },
    }),
    db.leaveRequest.findMany({
      where: {
        status: "APROBADA",
        startDate: { lte: dayEnd },
        endDate: { gte: dayStart },
        employee: { ...scope },
      },
      select: { employeeId: true },
    }),
    db.timeEntry.findMany({
      where: {
        date: { gte: dayStart, lte: dayEnd },
        employee: { ...scope, status: "ACTIVE" },
      },
      orderBy: { clockIn: "desc" },
      take: 8,
      select: {
        id: true,
        clockIn: true,
        clockOut: true,
        employee: {
          select: {
            nombres: true,
            apellidos: true,
            sede: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const onLeaveIds = new Set(todayLeaves.map((l) => l.employeeId));
  const lastByEmployee = new Map<string, { clockIn: Date; clockOut: Date | null }>();
  for (const e of todayEntries) {
    if (!lastByEmployee.has(e.employeeId)) {
      lastByEmployee.set(e.employeeId, { clockIn: e.clockIn, clockOut: e.clockOut });
    }
  }

  let trabajando = 0;
  let enPausa = 0;
  let sinFichar = 0;
  let vacIt = 0;

  for (const emp of activeEmployees) {
    if (onLeaveIds.has(emp.id)) {
      vacIt += 1;
      continue;
    }
    const last = lastByEmployee.get(emp.id);
    if (!last) {
      sinFichar += 1;
      continue;
    }
    if (last.clockOut === null) {
      trabajando += 1;
    } else {
      enPausa += 1;
    }
  }

  return {
    counts: { trabajando, enPausa, sinFichar, vacIt },
    totalActive: activeEmployees.length,
    recent: recent.map((r) => ({
      id: r.id,
      employeeName: `${r.employee.nombres} ${r.employee.apellidos}`.trim(),
      sedeName: r.employee.sede?.name ?? null,
      clockIn: r.clockIn,
      clockOut: r.clockOut,
    })),
  };
}
