import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfDay } from "@/lib/time";
import {
  combineDateTime,
  manualTimeEntrySchema,
} from "@/lib/validators/manual-time-entry";

function getIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const role = session.user.role;
    const canManage =
      role === "ADMIN" || role === "RRHH" || role === "MANAGER";
    if (!canManage) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const parsed = manualTimeEntrySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos no válidos",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }
    const { employeeId, date, clockIn, clockOut, breakMinutes, reason, notes } =
      parsed.data;

    // Autorización: MANAGER solo puede operar sobre su equipo
    if (role === "MANAGER") {
      const emp = await db.employee.findUnique({
        where: { id: employeeId },
        select: { reportsToId: true },
      });
      if (!emp || emp.reportsToId !== session.user.id) {
        return NextResponse.json(
          { error: "No tienes permiso para editar este empleado" },
          { status: 403 }
        );
      }
    }

    // Fecha normalizada al inicio del día
    const [y, m, d] = date.split("-").map(Number);
    const dateDay = new Date(y, m - 1, d, 0, 0, 0, 0);
    const today = startOfDay();
    if (dateDay.getTime() > today.getTime()) {
      return NextResponse.json(
        { error: "No puedes registrar fichajes futuros" },
        { status: 400 }
      );
    }

    const clockInDt = combineDateTime(date, clockIn);
    const clockOutDt = clockOut ? combineDateTime(date, clockOut) : null;

    // Validación pausa vs jornada
    if (clockOutDt) {
      const total = Math.round(
        (clockOutDt.getTime() - clockInDt.getTime()) / 60000
      );
      if (breakMinutes >= total) {
        return NextResponse.json(
          { error: "La pausa no puede ser mayor que la jornada" },
          { status: 400 }
        );
      }
    }

    const ip = getIp(req);

    // Upsert por (employeeId, date)
    const existing = await db.timeEntry.findUnique({
      where: { employeeId_date: { employeeId, date: dateDay } },
    });

    const wasEdit = !!existing;

    const entry = await db.$transaction(async (tx) => {
      const saved = existing
        ? await tx.timeEntry.update({
            where: { id: existing.id },
            data: {
              clockIn: clockInDt,
              clockOut: clockOutDt,
              breakMinutes,
              breakStartedAt: null,
              source: "MANUAL",
              isManual: true,
              manualReason: reason,
              notes: notes ?? null,
              ipAddress: ip,
            },
          })
        : await tx.timeEntry.create({
            data: {
              employeeId,
              date: dateDay,
              clockIn: clockInDt,
              clockOut: clockOutDt,
              breakMinutes,
              source: "MANUAL",
              isManual: true,
              manualReason: reason,
              notes: notes ?? null,
              ipAddress: ip,
            },
          });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: wasEdit ? "EDIT_TIME_ENTRY" : "CREATE_TIME_ENTRY",
          entityType: "TimeEntry",
          entityId: saved.id,
          details: {
            employeeId,
            date,
            clockIn,
            clockOut: clockOut ?? null,
            breakMinutes,
            reason,
          },
          ipAddress: ip,
        },
      });

      return saved;
    });

    return NextResponse.json({ entry });
  } catch (err) {
    console.error("POST /api/time-entries/manual error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
