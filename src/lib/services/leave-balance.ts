import { db } from "@/lib/db";
import type { LeaveBalance } from "@prisma/client";

/**
 * Asegura que exista LeaveBalance del año para el empleado, creándolo si no existe
 * usando la SedePolicy del año (o, como fallback, sede.vacationDays).
 */
export async function ensureLeaveBalance(params: {
  employeeId: string;
  sedeId: string;
  year: number;
}): Promise<LeaveBalance> {
  const { employeeId, sedeId, year } = params;

  const existing = await db.leaveBalance.findUnique({
    where: { employeeId_year: { employeeId, year } },
  });
  if (existing) return existing;

  const policy = await db.sedePolicy.findUnique({
    where: { sedeId_year: { sedeId, year } },
  });

  let totalDays = policy?.vacationDays ?? null;
  const personalTotal = policy?.extraPersonalDays ?? 0;

  if (totalDays === null) {
    const sede = await db.sede.findUnique({
      where: { id: sedeId },
      select: { vacationDays: true },
    });
    totalDays = sede?.vacationDays ?? 22;
  }

  return db.leaveBalance.create({
    data: {
      employeeId,
      sedeId,
      year,
      totalDays,
      usedDays: 0,
      pendingDays: 0,
      personalTotal,
      personalUsed: 0,
      personalPending: 0,
    },
  });
}

/**
 * Recalcula usedDays/pendingDays y personalUsed/personalPending a partir de las
 * solicitudes aprobadas/pendientes del año.
 */
export async function recomputeLeaveBalance(params: {
  employeeId: string;
  year: number;
}): Promise<LeaveBalance | null> {
  const { employeeId, year } = params;

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31));

  const balance = await db.leaveBalance.findUnique({
    where: { employeeId_year: { employeeId, year } },
  });
  if (!balance) return null;

  const requests = await db.leaveRequest.findMany({
    where: {
      employeeId,
      status: { in: ["PENDIENTE", "APROBADA"] },
      startDate: { lte: yearEnd },
      endDate: { gte: yearStart },
    },
    select: { type: true, status: true, totalDays: true },
  });

  let usedDays = 0;
  let pendingDays = 0;
  let personalUsed = 0;
  let personalPending = 0;

  for (const r of requests) {
    if (r.type === "VACACIONES") {
      if (r.status === "APROBADA") usedDays += r.totalDays;
      else if (r.status === "PENDIENTE") pendingDays += r.totalDays;
    } else if (r.type === "PERMISO_ASUNTOS_PROPIOS") {
      if (r.status === "APROBADA") personalUsed += r.totalDays;
      else if (r.status === "PENDIENTE") personalPending += r.totalDays;
    }
  }

  return db.leaveBalance.update({
    where: { employeeId_year: { employeeId, year } },
    data: { usedDays, pendingDays, personalUsed, personalPending },
  });
}
