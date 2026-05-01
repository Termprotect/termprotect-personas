import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface PendingLeaveItem {
  id: string;
  type: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  createdAt: Date;
  employeeId: string;
  employeeName: string;
  sedeId: string;
  sedeName: string;
}

export interface PendingLeavesResult {
  items: PendingLeaveItem[];
  total: number;
}

export async function getPendingLeaves(
  scope: Prisma.EmployeeWhereInput,
  limit: number = 20,
): Promise<PendingLeavesResult> {
  const [rows, total] = await Promise.all([
    db.leaveRequest.findMany({
      where: { status: "PENDIENTE", employee: scope },
      orderBy: { createdAt: "asc" },
      take: Math.max(1, Math.min(100, limit)),
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        totalDays: true,
        createdAt: true,
        employeeId: true,
        employee: {
          select: {
            nombres: true,
            apellidos: true,
            sedeId: true,
            sede: { select: { name: true } },
          },
        },
      },
    }),
    db.leaveRequest.count({ where: { status: "PENDIENTE", employee: scope } }),
  ]);

  return {
    total,
    items: rows.map((r) => ({
      id: r.id,
      type: r.type,
      startDate: r.startDate,
      endDate: r.endDate,
      totalDays: r.totalDays,
      createdAt: r.createdAt,
      employeeId: r.employeeId,
      employeeName: `${r.employee.nombres} ${r.employee.apellidos}`.trim(),
      sedeId: r.employee.sedeId,
      sedeName: r.employee.sede?.name ?? "",
    })),
  };
}
