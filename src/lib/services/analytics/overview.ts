import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  addMonths,
  dayOverlapCount,
  endOfMonth,
  getLast12MonthsBuckets,
  getMonthRange,
  startOfMonth,
  workingDaysInRange,
  type DateRange,
} from "./date-range";
import type { AnalyticsFilters } from "@/lib/validators/analytics";

export interface OverviewKpis {
  headcount: {
    current: number;
    deltaYear: number | null;
  };
  rotation12m: {
    rate: number | null;
    leavers: number;
    avgHeadcount: number;
  };
  absenteeismMonth: {
    rate: number | null;
    leaveDays: number;
    workingDays: number;
  };
  evalScore: {
    value: number | null;
    cycleName: string | null;
  };
  hoursWorkedMonth: number | null;
  pendingApprovals: number;
  activePips: number;
  headcountTrend: { month: string; count: number }[];
  sedeDistribution: { sedeId: string; sedeName: string; count: number }[];
  topAlerts: { id: string; label: string; count: number; severity: "critical" | "warning" | "info" }[];
}

const TERMINAL_STATUSES = ["BAJA_VOLUNTARIA", "DESPIDO"] as const;

export async function getOverviewKpis(
  scope: Prisma.EmployeeWhereInput,
  _filters: AnalyticsFilters,
  now: Date = new Date(),
): Promise<OverviewKpis> {
  const monthRange = getMonthRange(now);
  const last12mRange: DateRange = {
    from: startOfMonth(addMonths(now, -11)),
    to: endOfMonth(now),
  };
  const yearAgo = addMonths(now, -12);

  const activeWhere: Prisma.EmployeeWhereInput = { ...scope, status: "ACTIVE" };

  const [
    headcountCurrent,
    headcountYearAgo,
    leavers12m,
    pendingApprovals,
    activePips,
    sedeGroups,
    sedes,
    leavesOverlappingMonth,
    timeEntriesMonth,
    lastClosedCycle,
    docsExpiringSoon,
    docsExpired,
    contractsExpiring60,
    trialEnding30,
    unsignedRgpd,
  ] = await Promise.all([
    db.employee.count({ where: activeWhere }),
    db.employee.count({
      where: {
        ...scope,
        startDate: { lte: yearAgo },
        OR: [{ endDate: null }, { endDate: { gt: yearAgo } }],
      },
    }),
    db.employee.count({
      where: {
        ...scope,
        OR: [
          { endDate: { gte: last12mRange.from, lte: last12mRange.to } },
          {
            status: { in: TERMINAL_STATUSES as unknown as never },
            updatedAt: { gte: last12mRange.from, lte: last12mRange.to },
          },
        ],
      },
    }),
    db.leaveRequest.count({
      where: { status: "PENDIENTE", employee: scope },
    }),
    db.improvementPlan.count({
      where: { status: "ACTIVO", evaluation: { employee: scope } },
    }),
    db.employee.groupBy({
      by: ["sedeId"],
      where: activeWhere,
      _count: { _all: true },
    }),
    db.sede.findMany({ select: { id: true, name: true } }),
    db.leaveRequest.findMany({
      where: {
        status: "APROBADA",
        employee: scope,
        startDate: { lte: monthRange.to },
        endDate: { gte: monthRange.from },
      },
      select: { startDate: true, endDate: true },
    }),
    db.timeEntry.findMany({
      where: {
        employee: scope,
        date: { gte: monthRange.from, lte: monthRange.to },
        clockOut: { not: null },
      },
      select: { clockIn: true, clockOut: true, breakMinutes: true },
    }),
    db.evalCycle.findFirst({
      where: { status: "CERRADO" },
      orderBy: { endDate: "desc" },
      select: {
        id: true,
        name: true,
        evaluations: {
          where: { employee: scope, overallScore: { not: null } },
          select: { overallScore: true },
        },
      },
    }),
    db.employeeDocument.count({
      where: {
        employee: scope,
        expiresAt: { gte: now, lte: addMonths(now, 1) },
      },
    }),
    db.employeeDocument.count({
      where: {
        employee: scope,
        expiresAt: { lt: now, not: null },
      },
    }),
    db.employee.count({
      where: {
        ...scope,
        contractType: "TEMPORAL",
        endDate: { gte: now, lte: addMonths(now, 2) },
      },
    }),
    db.employee.count({
      where: {
        ...scope,
        trialEndDate: { gte: now, lte: addMonths(now, 1) },
      },
    }),
    db.employee.count({
      where: {
        ...scope,
        status: { in: ["ACTIVE", "INVITADO"] },
        clausulaAcceptedAt: null,
      },
    }),
  ]);

  const sedeMap = new Map(sedes.map((s) => [s.id, s.name]));

  const sedeDistribution = sedeGroups
    .map((g) => ({
      sedeId: g.sedeId,
      sedeName: sedeMap.get(g.sedeId) ?? g.sedeId,
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  const buckets = getLast12MonthsBuckets(now);
  const trendQueries = await Promise.all(
    buckets.map((b) =>
      db.employee.count({
        where: {
          ...scope,
          startDate: { lte: b.end },
          OR: [{ endDate: null }, { endDate: { gt: b.end } }],
        },
      }),
    ),
  );
  const headcountTrend = buckets.map((b, i) => ({ month: b.label, count: trendQueries[i] }));

  let leaveDaysInMonth = 0;
  for (const lr of leavesOverlappingMonth) {
    leaveDaysInMonth += dayOverlapCount(lr.startDate, lr.endDate, monthRange.from, monthRange.to);
  }
  const monthWorkingDays = workingDaysInRange(monthRange);
  const absenteeismDenom = headcountCurrent * monthWorkingDays;
  const absenteeismRate =
    absenteeismDenom > 0 ? (leaveDaysInMonth / absenteeismDenom) * 100 : null;

  const monthHoursWorked = timeEntriesMonth.length
    ? timeEntriesMonth.reduce((acc, e) => {
        if (!e.clockOut) return acc;
        const ms = e.clockOut.getTime() - e.clockIn.getTime();
        const hours = Math.max(0, ms / (1000 * 60 * 60) - (e.breakMinutes ?? 0) / 60);
        return acc + hours;
      }, 0)
    : null;

  const evalScores = lastClosedCycle?.evaluations
    ?.map((e) => e.overallScore)
    .filter((v): v is number => typeof v === "number") ?? [];
  const evalAverage = evalScores.length
    ? evalScores.reduce((a, b) => a + b, 0) / evalScores.length
    : null;

  const avgHeadcount = (headcountCurrent + headcountYearAgo) / 2;
  const turnoverRate = avgHeadcount > 0 ? (leavers12m / avgHeadcount) * 100 : null;

  const topAlerts: OverviewKpis["topAlerts"] = [];
  if (docsExpired > 0) topAlerts.push({ id: "docs-expired", label: "Documentos vencidos", count: docsExpired, severity: "critical" });
  if (docsExpiringSoon > 0) topAlerts.push({ id: "docs-30", label: "Documentos vencen en 30 días", count: docsExpiringSoon, severity: "warning" });
  if (contractsExpiring60 > 0) topAlerts.push({ id: "contracts", label: "Contratos temporales por renovar", count: contractsExpiring60, severity: "warning" });
  if (trialEnding30 > 0) topAlerts.push({ id: "trial", label: "Fin de periodo de prueba próximo", count: trialEnding30, severity: "info" });
  if (unsignedRgpd > 0) topAlerts.push({ id: "rgpd", label: "Empleados sin firmar RGPD", count: unsignedRgpd, severity: "warning" });

  return {
    headcount: {
      current: headcountCurrent,
      deltaYear: headcountCurrent - headcountYearAgo,
    },
    rotation12m: {
      rate: turnoverRate,
      leavers: leavers12m,
      avgHeadcount,
    },
    absenteeismMonth: {
      rate: absenteeismRate,
      leaveDays: leaveDaysInMonth,
      workingDays: monthWorkingDays,
    },
    evalScore: {
      value: evalAverage,
      cycleName: lastClosedCycle?.name ?? null,
    },
    hoursWorkedMonth: monthHoursWorked,
    pendingApprovals,
    activePips,
    headcountTrend,
    sedeDistribution,
    topAlerts: topAlerts.slice(0, 5),
  };
}
