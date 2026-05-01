import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface NineBoxCell {
  x: 1 | 2 | 3;
  y: 1 | 2 | 3;
  count: number;
  percentage: number;
}

export interface NineBoxResult {
  total: number;
  cells: NineBoxCell[];
  cycleName: string | null;
}

export async function getNineBox(
  scope: Prisma.EmployeeWhereInput,
): Promise<NineBoxResult> {
  const cycle =
    (await db.evalCycle.findFirst({
      where: { status: "CERRADO" },
      orderBy: { endDate: "desc" },
      select: { id: true, name: true },
    })) ??
    (await db.evalCycle.findFirst({
      where: { status: "ACTIVO" },
      orderBy: { startDate: "desc" },
      select: { id: true, name: true },
    }));

  const buckets: Record<string, number> = {};
  let total = 0;

  if (cycle) {
    const evals = await db.evaluation.findMany({
      where: {
        cycleId: cycle.id,
        employee: scope,
        overallScore: { not: null },
        managerScores: { not: Prisma.JsonNull },
      },
      select: { overallScore: true, managerScores: true },
    });

    for (const ev of evals) {
      const overall = ev.overallScore;
      if (typeof overall !== "number") continue;
      const ms = ev.managerScores as Record<string, unknown> | null;
      const potRaw =
        ms && typeof ms === "object" ? (ms.potential ?? ms.potencial) : null;
      const pot = typeof potRaw === "number" ? potRaw : null;
      if (pot === null) continue;
      total += 1;
      const x = bucket(pot);
      const y = bucket(overall);
      const k = `${x}-${y}`;
      buckets[k] = (buckets[k] ?? 0) + 1;
    }
  }

  const cells: NineBoxCell[] = [];
  for (let x = 1; x <= 3; x++) {
    for (let y = 1; y <= 3; y++) {
      const count = buckets[`${x}-${y}`] ?? 0;
      cells.push({
        x: x as 1 | 2 | 3,
        y: y as 1 | 2 | 3,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      });
    }
  }

  return { total, cells, cycleName: cycle?.name ?? null };
}

function bucket(score: number): 1 | 2 | 3 {
  if (score <= 2) return 1;
  if (score <= 3) return 2;
  return 3;
}
