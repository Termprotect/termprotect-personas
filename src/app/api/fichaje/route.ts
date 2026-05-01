import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { minutesBetween, startOfDay } from "@/lib/time";

const actionSchema = z.object({
  action: z.enum(["clock_in", "break_start", "break_end", "clock_out"]),
});

function getIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}

// GET: estado del fichaje de hoy
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const today = startOfDay();
    const entry = await db.timeEntry.findUnique({
      where: {
        employeeId_date: {
          employeeId: session.user.id,
          date: today,
        },
      },
    });

    return NextResponse.json({ entry });
  } catch (err) {
    console.error("GET /api/fichaje error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST: acciones de fichaje
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const employeeId = session.user.id;

    const parsed = actionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }
    const { action } = parsed.data;

    const today = startOfDay();
    const now = new Date();
    const ip = getIp(req);

    const existing = await db.timeEntry.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    switch (action) {
      case "clock_in": {
        if (existing) {
          return NextResponse.json(
            { error: "Ya has fichado entrada hoy" },
            { status: 409 }
          );
        }
        const entry = await db.timeEntry.create({
          data: {
            employeeId,
            date: today,
            clockIn: now,
            source: "WEB",
            ipAddress: ip,
          },
        });
        return NextResponse.json({ entry });
      }

      case "break_start": {
        if (!existing) {
          return NextResponse.json(
            { error: "Aún no has fichado entrada" },
            { status: 400 }
          );
        }
        if (existing.clockOut) {
          return NextResponse.json(
            { error: "Ya has cerrado la jornada" },
            { status: 400 }
          );
        }
        if (existing.breakStartedAt) {
          return NextResponse.json(
            { error: "Ya hay una pausa en curso" },
            { status: 400 }
          );
        }
        const entry = await db.timeEntry.update({
          where: { id: existing.id },
          data: { breakStartedAt: now },
        });
        return NextResponse.json({ entry });
      }

      case "break_end": {
        if (!existing || !existing.breakStartedAt) {
          return NextResponse.json(
            { error: "No hay una pausa en curso" },
            { status: 400 }
          );
        }
        if (existing.clockOut) {
          return NextResponse.json(
            { error: "Ya has cerrado la jornada" },
            { status: 400 }
          );
        }
        const addedBreak = minutesBetween(existing.breakStartedAt, now);
        const entry = await db.timeEntry.update({
          where: { id: existing.id },
          data: {
            breakMinutes: { increment: addedBreak },
            breakStartedAt: null,
          },
        });
        return NextResponse.json({ entry });
      }

      case "clock_out": {
        if (!existing) {
          return NextResponse.json(
            { error: "Aún no has fichado entrada" },
            { status: 400 }
          );
        }
        if (existing.clockOut) {
          return NextResponse.json(
            { error: "Ya has fichado salida" },
            { status: 409 }
          );
        }
        // Si hay pausa en curso, la cerramos automáticamente
        let breakMinutes = existing.breakMinutes;
        if (existing.breakStartedAt) {
          breakMinutes += minutesBetween(existing.breakStartedAt, now);
        }
        const entry = await db.timeEntry.update({
          where: { id: existing.id },
          data: {
            clockOut: now,
            breakMinutes,
            breakStartedAt: null,
          },
        });
        return NextResponse.json({ entry });
      }
    }
  } catch (err) {
    console.error("POST /api/fichaje error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
