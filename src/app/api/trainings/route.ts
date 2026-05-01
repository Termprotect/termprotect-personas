import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trainingSchema, parseDateOnly } from "@/lib/validators/training";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const rows = await db.training.findMany({
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { enrollments: true } },
      },
    });

    return NextResponse.json({ items: rows });
  } catch (err) {
    console.error("GET /api/trainings error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
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
    const parsed = trainingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const v = parsed.data;

    const created = await db.training.create({
      data: {
        title: v.title,
        provider: v.provider ?? null,
        mode: v.mode,
        hours: v.hours,
        cost: v.cost ?? null,
        mandatory: v.mandatory ?? false,
        mandatoryType: v.mandatory ? v.mandatoryType ?? null : null,
        fundaeEligible: v.fundaeEligible ?? false,
        description: v.description ?? null,
        startDate: v.startDate ? parseDateOnly(v.startDate) : null,
        endDate: v.endDate ? parseDateOnly(v.endDate) : null,
      },
      select: { id: true },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_TRAINING",
        entityType: "Training",
        entityId: created.id,
        details: { title: v.title, mandatory: v.mandatory },
      },
    });

    return NextResponse.json({ id: created.id });
  } catch (err) {
    console.error("POST /api/trainings error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
