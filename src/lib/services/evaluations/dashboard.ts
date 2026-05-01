import { db } from "@/lib/db";

export interface CycleSummary {
  id: string;
  name: string;
  status: "BORRADOR" | "ACTIVO" | "CERRADO";
  startDate: Date;
  endDate: Date;
  total: number;
  evaluated: number;
  progressPct: number;
  avgScore: number | null;
}

export interface EvaluationsDashboard {
  activeCycles: number;
  totalEvaluations: number;
  avgScore: number | null;
  deltaScore: number | null;
  activePips: number;
  cyclesInProgress: CycleSummary[];
}

export async function getEvaluationsDashboard(
  now: Date = new Date(),
): Promise<EvaluationsDashboard> {
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const [
    activeCycleRows,
    closedRecent,
    totalEvaluations,
    currentAvg,
    previousAvg,
    activePips,
  ] = await Promise.all([
    db.evalCycle.findMany({
      where: { status: { in: ["ACTIVO", "BORRADOR"] } },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        evaluations: {
          select: { id: true, status: true, overallScore: true },
        },
      },
    }),
    db.evalCycle.findMany({
      where: { status: "CERRADO" },
      orderBy: { endDate: "desc" },
      take: 3,
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        evaluations: { select: { id: true, status: true, overallScore: true } },
      },
    }),
    db.evaluation.count(),
    db.evaluation.aggregate({
      where: {
        status: "CERRADA",
        cycle: { status: "CERRADO" },
        overallScore: { not: null },
      },
      _avg: { overallScore: true },
    }),
    db.evaluation.aggregate({
      where: {
        status: "CERRADA",
        cycle: { status: "CERRADO", endDate: { lte: yearAgo } },
        overallScore: { not: null },
      },
      _avg: { overallScore: true },
    }),
    db.improvementPlan.count({ where: { status: "ACTIVO" } }),
  ]);

  function summarize(
    c:
      | (typeof activeCycleRows)[number]
      | (typeof closedRecent)[number],
  ): CycleSummary {
    const total = c.evaluations.length;
    const evaluated = c.evaluations.filter((e) => e.status === "CERRADA").length;
    const progressPct = total > 0 ? Math.round((evaluated / total) * 100) : 0;
    const scores = c.evaluations
      .map((e) => e.overallScore)
      .filter((v): v is number => typeof v === "number");
    const avgScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null;
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
      total,
      evaluated,
      progressPct,
      avgScore,
    };
  }

  const cyclesInProgress = [...activeCycleRows, ...closedRecent].map(summarize);

  const currentAvgValue = currentAvg._avg.overallScore;
  const previousAvgValue = previousAvg._avg.overallScore;
  const deltaScore =
    currentAvgValue !== null && previousAvgValue !== null
      ? Math.round((currentAvgValue - previousAvgValue) * 100) / 100
      : null;

  return {
    activeCycles: activeCycleRows.length,
    totalEvaluations,
    avgScore: currentAvgValue !== null ? Math.round(currentAvgValue * 100) / 100 : null,
    deltaScore,
    activePips,
    cyclesInProgress,
  };
}
