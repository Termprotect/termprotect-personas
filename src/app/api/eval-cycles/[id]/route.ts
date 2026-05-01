import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { evalCycleUpdateSchema } from "@/lib/validators/evaluation";

export const runtime = "nodejs";

function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!["ADMIN", "RRHH"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
    const { id } = await params;
    const c = await db.evalCycle.findUnique({
      where: { id },
      include: { _count: { select: { evaluations: true } } },
    });
    if (!c) {
      return NextResponse.json({ error: "Ciclo no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ cycle: c });
  } catch (err) {
    console.error("GET /api/eval-cycles/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!["ADMIN", "RRHH"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = evalCycleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const v = parsed.data;

    const existing = await db.evalCycle.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ciclo no encontrado" }, { status: 404 });
    }

    // Reglas de transición de estado
    if (v.status) {
      const from = existing.status;
      const to = v.status;
      const allowed =
        (from === "BORRADOR" && to === "ACTIVO") ||
        (from === "ACTIVO" && to === "CERRADO") ||
        from === to;
      if (!allowed) {
        return NextResponse.json(
          { error: `Transición no permitida ${from} → ${to}` },
          { status: 400 }
        );
      }
    }

    await db.evalCycle.update({
      where: { id },
      data: {
        name: v.name,
        startDate: v.startDate ? parseDateOnly(v.startDate) : undefined,
        endDate: v.endDate ? parseDateOnly(v.endDate) : undefined,
        status: v.status,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_EVAL_CYCLE",
        entityType: "EvalCycle",
        entityId: id,
        details: v,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/eval-cycles/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!["ADMIN", "RRHH"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
    const { id } = await params;
    const c = await db.evalCycle.findUnique({
      where: { id },
      select: { id: true, status: true, _count: { select: { evaluations: true } } },
    });
    if (!c) {
      return NextResponse.json({ error: "Ciclo no encontrado" }, { status: 404 });
    }
    if (c.status !== "BORRADOR") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar ciclos en borrador" },
        { status: 400 }
      );
    }
    if (c._count.evaluations > 0) {
      // limpiar evaluaciones (solo en borrador: aún no se usan)
      await db.evaluation.deleteMany({ where: { cycleId: id } });
    }
    await db.evalCycle.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_EVAL_CYCLE",
        entityType: "EvalCycle",
        entityId: id,
        details: {},
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/eval-cycles/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
