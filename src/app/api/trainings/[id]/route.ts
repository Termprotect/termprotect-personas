import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trainingSchema, parseDateOnly } from "@/lib/validators/training";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const { id } = await params;
    const training = await db.training.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!training) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json(training);
  } catch (err) {
    console.error("GET /api/trainings/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
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
    const parsed = trainingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const v = parsed.data;

    await db.training.update({
      where: { id },
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
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_TRAINING",
        entityType: "Training",
        entityId: id,
        details: { title: v.title },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/trainings/[id] error:", err);
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

    const enrollments = await db.trainingEnrollment.count({
      where: { trainingId: id },
    });
    if (enrollments > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar: hay empleados inscritos. Cancela primero las inscripciones.",
        },
        { status: 409 }
      );
    }

    await db.training.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_TRAINING",
        entityType: "Training",
        entityId: id,
        details: {},
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/trainings/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
