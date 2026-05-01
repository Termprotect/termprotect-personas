import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type CalendarLeaveType =
  | "VACACIONES"
  | "INCAPACIDAD_TEMPORAL"
  | "PERMISO"
  | "EXCEDENCIA"
  | "OTRO";

export interface CalendarEvent {
  id: string;
  employeeName: string;
  sedeId: string;
  sedeName: string;
  type: CalendarLeaveType;
  rawType: string;
  startDate: Date;
  endDate: Date;
  status: "APROBADA" | "PENDIENTE";
}

export interface TeamCalendarResult {
  monthStart: Date;
  monthEnd: Date;
  events: CalendarEvent[];
}

function categorize(type: string): CalendarLeaveType {
  if (type === "VACACIONES") return "VACACIONES";
  if (type === "INCAPACIDAD_TEMPORAL") return "INCAPACIDAD_TEMPORAL";
  if (type.startsWith("EXCEDENCIA")) return "EXCEDENCIA";
  if (type.startsWith("PERMISO_")) return "PERMISO";
  return "OTRO";
}

export async function getTeamCalendar(
  scope: Prisma.EmployeeWhereInput,
  monthStart: Date,
): Promise<TeamCalendarResult> {
  const monthEnd = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  const rows = await db.leaveRequest.findMany({
    where: {
      employee: scope,
      status: { in: ["APROBADA", "PENDIENTE"] },
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      type: true,
      status: true,
      startDate: true,
      endDate: true,
      employee: {
        select: {
          nombres: true,
          apellidos: true,
          sedeId: true,
          sede: { select: { name: true } },
        },
      },
    },
  });

  const events: CalendarEvent[] = rows.map((r) => ({
    id: r.id,
    employeeName: `${r.employee.nombres} ${r.employee.apellidos}`.trim(),
    sedeId: r.employee.sedeId,
    sedeName: r.employee.sede?.name ?? "",
    type: categorize(r.type),
    rawType: r.type,
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status as "APROBADA" | "PENDIENTE",
  }));

  return { monthStart, monthEnd, events };
}
