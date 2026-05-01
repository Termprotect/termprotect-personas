import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { addDays } from "./date-range";

export interface HeatmapCell {
  date: string;
  deltaPct: number;
}

export interface HeatmapRow {
  sedeId: string;
  sedeName: string;
  cells: HeatmapCell[];
}

export interface PresenceHeatmapResult {
  days: number;
  rows: HeatmapRow[];
}

const DAYS = 30;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isWorkingDay(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

export async function getPresenceHeatmap(
  scope: Prisma.EmployeeWhereInput,
  now: Date = new Date(),
): Promise<PresenceHeatmapResult> {
  const from = addDays(now, -DAYS + 1);
  from.setHours(0, 0, 0, 0);

  const [sedes, sedeCounts, leavesInRange] = await Promise.all([
    db.sede.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.employee.groupBy({
      by: ["sedeId"],
      where: { ...scope, status: "ACTIVE" },
      _count: { _all: true },
    }),
    db.leaveRequest.findMany({
      where: {
        status: "APROBADA",
        employee: scope,
        startDate: { lte: now },
        endDate: { gte: from },
      },
      select: {
        startDate: true,
        endDate: true,
        employee: { select: { sedeId: true } },
      },
    }),
  ]);

  const headcountBySede = new Map<string, number>();
  for (const g of sedeCounts) headcountBySede.set(g.sedeId, g._count._all);

  const rows: HeatmapRow[] = [];
  for (const sede of sedes) {
    const total = headcountBySede.get(sede.id) ?? 0;
    if (total === 0) continue;
    const cells: HeatmapCell[] = [];
    for (let i = 0; i < DAYS; i++) {
      const day = addDays(from, i);
      day.setHours(0, 0, 0, 0);
      let absent = 0;
      for (const lr of leavesInRange) {
        if (lr.employee.sedeId !== sede.id) continue;
        const lrStart = new Date(lr.startDate);
        lrStart.setHours(0, 0, 0, 0);
        const lrEnd = new Date(lr.endDate);
        lrEnd.setHours(23, 59, 59, 999);
        if (day >= lrStart && day <= lrEnd) absent += 1;
      }
      const presence = total > 0 ? (total - absent) / total : 1;
      const expected = isWorkingDay(day) ? 0.95 : 0;
      cells.push({
        date: isoDate(day),
        deltaPct: Math.round((presence - expected) * 100) / 100,
      });
    }
    rows.push({ sedeId: sede.id, sedeName: sede.name, cells });
  }

  return { days: DAYS, rows };
}
