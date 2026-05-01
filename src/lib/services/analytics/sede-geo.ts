import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { dayOverlapCount, getMonthRange, workingDaysInRange } from "./date-range";

export interface SedeGeoNode {
  id: string;
  code: string;
  name: string;
  lat: number | null;
  lon: number | null;
  headcount: number;
  absenteeismRate: number | null;
}

export interface SedeGeoResult {
  sedes: SedeGeoNode[];
}

const COORDS: Record<string, { code: string; lat: number; lon: number }> = {
  Madrid:    { code: "MAD", lat: 40.4168, lon: -3.7038 },
  Barcelona: { code: "BCN", lat: 41.3874, lon: 2.1686  },
  Valencia:  { code: "VLC", lat: 39.4699, lon: -0.3763 },
  "Málaga":  { code: "MLG", lat: 36.7213, lon: -4.4214 },
  Malaga:    { code: "MLG", lat: 36.7213, lon: -4.4214 },
};

export async function getSedeGeo(
  scope: Prisma.EmployeeWhereInput,
  now: Date = new Date(),
): Promise<SedeGeoResult> {
  const monthRange = getMonthRange(now);
  const monthWorkingDays = workingDaysInRange(monthRange);

  const [sedes, sedeHeadcounts, leaves] = await Promise.all([
    db.sede.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.employee.groupBy({
      by: ["sedeId"],
      where: { ...scope, status: "ACTIVE" },
      _count: { _all: true },
    }),
    db.leaveRequest.findMany({
      where: {
        status: "APROBADA",
        employee: scope,
        startDate: { lte: monthRange.to },
        endDate: { gte: monthRange.from },
      },
      select: {
        startDate: true,
        endDate: true,
        employee: { select: { sedeId: true } },
      },
    }),
  ]);

  const headcountBySede = new Map<string, number>();
  for (const g of sedeHeadcounts) headcountBySede.set(g.sedeId, g._count._all);

  const leaveDaysBySede = new Map<string, number>();
  for (const lr of leaves) {
    const days = dayOverlapCount(lr.startDate, lr.endDate, monthRange.from, monthRange.to);
    const sid = lr.employee.sedeId;
    leaveDaysBySede.set(sid, (leaveDaysBySede.get(sid) ?? 0) + days);
  }

  const result: SedeGeoNode[] = sedes.map((s) => {
    const headcount = headcountBySede.get(s.id) ?? 0;
    const denom = headcount * monthWorkingDays;
    const leaveDays = leaveDaysBySede.get(s.id) ?? 0;
    const absenteeismRate =
      denom > 0 ? Math.round((leaveDays / denom) * 1000) / 10 : null;
    const coord = COORDS[s.name];
    return {
      id: s.id,
      code: coord?.code ?? s.name.slice(0, 3).toUpperCase(),
      name: s.name,
      lat: coord?.lat ?? null,
      lon: coord?.lon ?? null,
      headcount,
      absenteeismRate,
    };
  });

  return { sedes: result };
}
