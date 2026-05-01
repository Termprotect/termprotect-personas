import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { evalCycleCreateSchema } from "@/lib/validators/evaluation";

export const runtime = "nodejs";

function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!["ADMIN", "RRHH"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const cycles = await db.evalCycle.findMany({
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { evaluations: true } },
      },
    });

    // Métricas por ciclo
    const counts = await db.evaluation.groupBy({
      by: ["cycleId", "status"],
      _count: { _all: true },
    });
    const byCycle = new Map<string, Record<string, number>>();
    for (const c of counts) {
      if (!byCycle.has(c.cycleId)) byCycle.set(c.cycleId, {});
      byCycle.get(c.cycleId)![c.status] = c._count._all;
    }

    const items = cycles.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      startDate: c.startDate.toISOString().slice(0, 10),
      endDate: c.endDate.toISOString().slice(0, 10),
      status: c.status,
      total: c._count.evaluations,
      byStatus: byCycle.get(c.id) ?? {},
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/eval-cycles error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!["ADMIN", "RRHH"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = evalCycleCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const { name, kind, startDate, endDate } = parsed.data;

    const created = await db.evalCycle.create({
      data: {
        name,
        kind,
        startDate: parseDateOnly(startDate),
        endDate: parseDateOnly(endDate),
        status: "BORRADOR",
        createdBy: session.user.id,
      },
      select: { id: true },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_EVAL_CYCLE",
        entityType: "EvalCycle",
        entityId: created.id,
        details: { name, kind, startDate, endDate },
      },
    });

    return NextResponse.json({ id: created.id });
  } catch (err) {
    console.error("POST /api/eval-cycles error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
