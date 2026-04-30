import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  addMonths,
  endOfMonth,
  rangeForPeriod,
  startOfMonth,
  type DateRange,
} from "./date-range";
import type { AnalyticsFilters } from "@/lib/validators/analytics";

export interface WorkforceMetrics {
  headcount: number;
  newHires: number;
  leavers: number;
  turnoverRate: number | null;
  avgTenureYears: number | null;
  bySede: { sedeId: string; sedeName: string; count: number }[];
  byDepartment: { department: string; count: number }[];
  byContractType: { contractType: string; count: number }[];
  ageDistribution: { bucket: string; count: number }[] | null;
  range: { from: string; to: string };
}

const TERMINAL_STATUSES = ["BAJA_VOLUNTARIA", "DESPIDO"] as const;

const AGE_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "<25", min: 0, max: 24 },
  { label: "25-34", min: 25, max: 34 },
  { label: "35-44", min: 35, max: 44 },
  { label: "45-54", min: 45, max: 54 },
  { label: "55+", min: 55, max: 200 },
];

function ageFromBirthDate(birth: Date, now: Date): number {
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export async function getWorkforceMetrics(
  scope: Prisma.EmployeeWhereInput,
  filters: AnalyticsFilters,
  now: Date = new Date(),
): Promise<WorkforceMetrics> {
  const range = rangeForPeriod(filters.period, now);
  const last12mRange: DateRange = {
    from: startOfMonth(addMonths(now, -11)),
    to: endOfMonth(now),
  };
  const yearAgo = addMonths(now, -12);
  const activeWhere: Prisma.EmployeeWhereInput = { ...scope, status: "ACTIVE" };

  const [
    headcount,
    headcountYearAgo,
    leavers12m,
    newHires,
    leaversInRange,
    sedeGroups,
    departmentGroups,
    contractGroups,
    sedes,
    activeStartDates,
    birthDates,
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
    db.employee.count({
      where: {
        ...scope,
        startDate: { gte: range.from, lte: range.to },
      },
    }),
    db.employee.count({
      where: {
        ...scope,
        OR: [
          { endDate: { gte: range.from, lte: range.to } },
          {
            status: { in: TERMINAL_STATUSES as unknown as never },
            updatedAt: { gte: range.from, lte: range.to },
          },
        ],
      },
    }),
    db.employee.groupBy({
      by: ["sedeId"],
      where: activeWhere,
      _count: { _all: true },
    }),
    db.employee.groupBy({
      by: ["department"],
      where: { ...activeWhere, department: { not: null } },
      _count: { _all: true },
    }),
    db.employee.groupBy({
      by: ["contractType"],
      where: { ...activeWhere, contractType: { not: null } },
      _count: { _all: true },
    }),
    db.sede.findMany({ select: { id: true, name: true } }),
    db.employee.findMany({
      where: { ...activeWhere, startDate: { not: null } },
      select: { startDate: true },
    }),
    db.employee.findMany({
      where: { ...activeWhere, birthDate: { not: null } },
      select: { birthDate: true },
    }),
  ]);

  const sedeMap = new Map(sedes.map((s) => [s.id, s.name]));
  const bySede = sedeGroups
    .map((g) => ({
      sedeId: g.sedeId,
      sedeName: sedeMap.get(g.sedeId) ?? g.sedeId,
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  const byDepartment = departmentGroups
    .filter((g) => g.department != null)
    .map((g) => ({ department: g.department as string, count: g._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const byContractType = contractGroups
    .filter((g) => g.contractType != null)
    .map((g) => ({ contractType: g.contractType as string, count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  const tenureYears = activeStartDates
    .map((e) => (e.startDate ? (now.getTime() - e.startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25) : null))
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const avgTenureYears = tenureYears.length
    ? tenureYears.reduce((a, b) => a + b, 0) / tenureYears.length
    : null;

  const avgHeadcount = (headcount + headcountYearAgo) / 2;
  const turnoverRate = avgHeadcount > 0 ? (leavers12m / avgHeadcount) * 100 : null;

  let ageDistribution: WorkforceMetrics["ageDistribution"] = null;
  if (birthDates.length >= 3) {
    const counts = AGE_BUCKETS.map((b) => ({ bucket: b.label, count: 0 }));
    for (const e of birthDates) {
      if (!e.birthDate) continue;
      const age = ageFromBirthDate(e.birthDate, now);
      const idx = AGE_BUCKETS.findIndex((b) => age >= b.min && age <= b.max);
      if (idx >= 0) counts[idx].count++;
    }
    ageDistribution = counts;
  }

  return {
    headcount,
    newHires,
    leavers: leaversInRange,
    turnoverRate,
    avgTenureYears,
    bySede,
    byDepartment,
    byContractType,
    ageDistribution,
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
  };
}
