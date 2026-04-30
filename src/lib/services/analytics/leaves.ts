import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { rangeForPeriod } from "./date-range";
import type { AnalyticsFilters } from "@/lib/validators/analytics";

export interface LeaveListItem {
  id: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  totalDays: number;
}

export interface LeaveMetrics {
  byStatus: { status: string; count: number }[];
  vacationConsumption: {
    totalDays: number;
    usedDays: number;
    pendingDays: number;
    rate: number | null;
  };
  personalConsumption: null;
  byType: { type: string; count: number }[];
  bySede: { sedeId: string; sedeName: string; count: number }[];
  pendingApprovalsList: LeaveListItem[];
  upcomingApproved: LeaveListItem[];
}

export async function getLeaveMetrics(
  scope: Prisma.EmployeeWhereInput,
  filters: AnalyticsFilters,
  now: Date = new Date(),
): Promise<LeaveMetrics> {
  const range = rangeForPeriod(filters.period, now);
  const currentYear = now.getFullYear();

  const [
    byStatusGroup,
    byTypeGroup,
    leavesBySede,
    sedes,
    balances,
    pendingList,
    upcomingList,
  ] = await Promise.all([
    db.leaveRequest.groupBy({
      by: ["status"],
      where: {
        employee: scope,
        startDate: { lte: range.to },
        endDate: { gte: range.from },
      },
      _count: { _all: true },
    }),
    db.leaveRequest.groupBy({
      by: ["type"],
      where: {
        employee: scope,
        status: "APROBADA",
        startDate: { gte: range.from, lte: range.to },
      },
      _count: { _all: true },
    }),
    db.leaveRequest.findMany({
      where: {
        employee: scope,
        status: "APROBADA",
        startDate: { gte: range.from, lte: range.to },
      },
      select: {
        employee: { select: { sedeId: true } },
      },
    }),
    db.sede.findMany({ select: { id: true, name: true } }),
    db.leaveBalance.findMany({
      where: { year: currentYear, employee: scope },
      select: { totalDays: true, usedDays: true, pendingDays: true },
    }),
    db.leaveRequest.findMany({
      where: { employee: scope, status: "PENDIENTE" },
      orderBy: { startDate: "asc" },
      take: 12,
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        totalDays: true,
        employee: { select: { nombres: true, apellidos: true } },
      },
    }),
    db.leaveRequest.findMany({
      where: { employee: scope, status: "APROBADA", startDate: { gte: now } },
      orderBy: { startDate: "asc" },
      take: 10,
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        totalDays: true,
        employee: { select: { nombres: true, apellidos: true } },
      },
    }),
  ]);

  const sedeMap = new Map(sedes.map((s) => [s.id, s.name]));
  const sedeCounts = new Map<string, number>();
  for (const r of leavesBySede) {
    if (!r.employee?.sedeId) continue;
    sedeCounts.set(r.employee.sedeId, (sedeCounts.get(r.employee.sedeId) ?? 0) + 1);
  }
  const bySede = Array.from(sedeCounts.entries())
    .map(([sedeId, count]) => ({
      sedeId,
      sedeName: sedeMap.get(sedeId) ?? sedeId,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const totalDays = balances.reduce((a, b) => a + b.totalDays, 0);
  const usedDays = balances.reduce((a, b) => a + b.usedDays, 0);
  const pendingDays = balances.reduce((a, b) => a + b.pendingDays, 0);
  const consumptionRate = totalDays > 0 ? (usedDays / totalDays) * 100 : null;

  const formatList = (rows: typeof pendingList): LeaveListItem[] =>
    rows.map((r) => ({
      id: r.id,
      employeeName: `${r.employee.nombres} ${r.employee.apellidos}`,
      type: r.type,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      totalDays: r.totalDays,
    }));

  return {
    byStatus: byStatusGroup.map((g) => ({ status: g.status, count: g._count._all })),
    vacationConsumption: { totalDays, usedDays, pendingDays, rate: consumptionRate },
    personalConsumption: null,
    byType: byTypeGroup.map((g) => ({ type: g.type, count: g._count._all })),
    bySede,
    pendingApprovalsList: formatList(pendingList),
    upcomingApproved: formatList(upcomingList),
  };
}
