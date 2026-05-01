import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { addMonths, getMonthRange, startOfYear } from "./date-range";

export interface MiniKpisResult {
  hoursWorkedMonth: number;
  pendingApprovals: number;
  activePips: number;
  docsExpiringIn30d: number;
  contractsToRenew: number;
  fundaeHoursYtd: number;
}

export async function getMiniKpis(
  scope: Prisma.EmployeeWhereInput,
  now: Date = new Date(),
): Promise<MiniKpisResult> {
  const monthRange = getMonthRange(now);
  const yearStart = startOfYear(now);
  const in30 = addMonths(now, 1);
  const in60 = addMonths(now, 2);

  const [
    monthEntries,
    pendingApprovals,
    activePips,
    docsExpiringIn30d,
    contractsToRenew,
    fundaeEnrollments,
  ] = await Promise.all([
    db.timeEntry.findMany({
      where: {
        employee: scope,
        date: { gte: monthRange.from, lte: monthRange.to },
        clockOut: { not: null },
      },
      select: { clockIn: true, clockOut: true, breakMinutes: true },
    }),
    db.leaveRequest.count({
      where: { status: "PENDIENTE", employee: scope },
    }),
    db.improvementPlan.count({
      where: { status: "ACTIVO", evaluation: { employee: scope } },
    }),
    db.employeeDocument.count({
      where: {
        employee: scope,
        expiresAt: { gte: now, lte: in30 },
      },
    }),
    db.employee.count({
      where: {
        ...scope,
        contractType: "TEMPORAL",
        endDate: { gte: now, lte: in60 },
      },
    }),
    db.trainingEnrollment.findMany({
      where: {
        status: "COMPLETADO",
        completedAt: { gte: yearStart },
        training: { fundaeEligible: true },
        employee: scope,
      },
      select: {
        hoursCompleted: true,
        training: { select: { hours: true } },
      },
    }),
  ]);

  const hoursWorkedMonth = monthEntries.reduce((acc, e) => {
    if (!e.clockOut) return acc;
    const ms = e.clockOut.getTime() - e.clockIn.getTime();
    return acc + Math.max(0, ms / (1000 * 60 * 60) - (e.breakMinutes ?? 0) / 60);
  }, 0);

  const fundaeHoursYtd = fundaeEnrollments.reduce(
    (acc, e) => acc + (e.hoursCompleted ?? e.training.hours ?? 0),
    0,
  );

  return {
    hoursWorkedMonth: Math.round(hoursWorkedMonth),
    pendingApprovals,
    activePips,
    docsExpiringIn30d,
    contractsToRenew,
    fundaeHoursYtd: Math.round(fundaeHoursYtd),
  };
}
