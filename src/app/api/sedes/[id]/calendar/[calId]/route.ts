import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseDateOnly, sedeCalendarSchema } from "@/lib/validators/sede-config";

function getIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}

async function guard() {
  const session = await auth();
  if (!session?.user)
    return {
      session: null,
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  if (session.user.role !== "ADMIN" && session.user.role !== "RRHH")
    return {
      session: null,
      error: NextResponse.json({ error: "Sin permiso" }, { status: 403 }),
    };
  return { session, error: null };
}

// PATCH: editar festivo
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; calId: string }> }
) {
  try {
    const g = await guard();
    if (g.error) return g.error;
    const session = g.session!;

    const { id: sedeId, calId } = await ctx.params;
    const parsed = sedeCalendarSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos no válidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { date, description, type } = parsed.data;
    const dateDt = parseDateOnly(date);

    // Verificar pertenencia
    const existing = await db.sedeCalendar.findUnique({ where: { id: calId } });
    if (!existing || existing.sedeId !== sedeId) {
      return NextResponse.json({ error: "Festivo no encontrado" }, { status: 404 });
    }

    try {
      const cal = await db.sedeCalendar.update({
        where: { id: calId },
        data: { date: dateDt, description, type },
      });
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "EDIT_HOLIDAY",
          entityType: "SedeCalendar",
          entityId: cal.id,
          details: { sedeId, date, description, type },
          ipAddress: getIp(req),
        },
      });
      return NextResponse.json({ calendar: cal });
    } catch (e) {
      if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe un festivo en esa fecha" },
          { status: 409 }
        );
      }
      throw e;
    }
  } catch (err) {
    console.error("PATCH /api/sedes/[id]/calendar/[calId]:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE: borrar festivo
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; calId: string }> }
) {
  try {
    const g = await guard();
    if (g.error) return g.error;
    const session = g.session!;

    const { id: sedeId, calId } = await ctx.params;
    const existing = await db.sedeCalendar.findUnique({ where: { id: calId } });
    if (!existing || existing.sedeId !== sedeId) {
      return NextResponse.json({ error: "Festivo no encontrado" }, { status: 404 });
    }

    await db.sedeCalendar.delete({ where: { id: calId } });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_HOLIDAY",
        entityType: "SedeCalendar",
        entityId: calId,
        details: { sedeId, date: existing.date, description: existing.description },
        ipAddress: getIp(req),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/sedes/[id]/calendar/[calId]:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
