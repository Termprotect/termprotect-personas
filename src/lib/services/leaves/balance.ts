import { db } from "@/lib/db";

export interface MyBalanceResult {
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  asuntosPropDays: number;
  year: number;
}

export async function getMyBalance(
  employeeId: string,
  now: Date = new Date(),
): Promise<MyBalanceResult> {
  const year = now.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  const [balance, asuntosPropAggregate] = await Promise.all([
    db.leaveBalance.findFirst({
      where: { employeeId, year },
      select: { totalDays: true, usedDays: true, pendingDays: true },
    }),
    db.leaveRequest.aggregate({
      where: {
        employeeId,
        type: "PERMISO_ASUNTOS_PROPIOS",
        status: "APROBADA",
        startDate: { gte: yearStart, lte: yearEnd },
      },
      _sum: { totalDays: true },
    }),
  ]);

  return {
    totalDays: balance?.totalDays ?? 0,
    usedDays: balance?.usedDays ?? 0,
    pendingDays: balance?.pendingDays ?? 0,
    asuntosPropDays: asuntosPropAggregate._sum.totalDays ?? 0,
    year,
  };
}
