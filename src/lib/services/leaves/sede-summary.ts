import { db } from "@/lib/db";

export interface SedeLeaveSummary {
  sedeId: string;
  sedeName: string;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  consumptionPct: number;
}

export async function getSedeLeaveSummary(
  now: Date = new Date(),
): Promise<{ sedes: SedeLeaveSummary[] }> {
  const year = now.getFullYear();

  const [groups, sedes] = await Promise.all([
    db.leaveBalance.groupBy({
      by: ["sedeId"],
      where: { year },
      _sum: { totalDays: true, usedDays: true, pendingDays: true },
    }),
    db.sede.findMany({ select: { id: true, name: true } }),
  ]);

  const sedeMap = new Map(sedes.map((s) => [s.id, s.name]));

  const result: SedeLeaveSummary[] = groups.map((g) => {
    const total = g._sum.totalDays ?? 0;
    const used = g._sum.usedDays ?? 0;
    const pending = g._sum.pendingDays ?? 0;
    const consumptionPct = total > 0 ? Math.round(((used + pending) / total) * 1000) / 10 : 0;
    return {
      sedeId: g.sedeId,
      sedeName: sedeMap.get(g.sedeId) ?? g.sedeId,
      totalDays: total,
      usedDays: used,
      pendingDays: pending,
      consumptionPct,
    };
  });

  result.sort((a, b) => a.sedeName.localeCompare(b.sedeName));
  return { sedes: result };
}
