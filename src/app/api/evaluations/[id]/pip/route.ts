import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pipSchema } from "@/lib/validators/evaluation";

export const runtime = "nodejs";

function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export async function POST(
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

    const ev = await db.evaluation.findUnique({
      where: { id },
      include: { improvementPlan: true },
    });
    if (!ev) {
      return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = pipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const v = parsed.data;

    if (ev.improvementPlan) {
      await db.improvementPlan.update({
        where: { evaluationId: id },
        data: {
          objectives: v.objectives,
          deadline: parseDateOnly(v.deadline),
          status: v.status ?? "ACTIVO",
          notes: v.notes ?? null,
        },
      });
    } else {
      await db.improvementPlan.create({
        data: {
          evaluationId: id,
          objectives: v.objectives,
          deadline: parseDateOnly(v.deadline),
          status: v.status ?? "ACTIVO",
          notes: v.notes ?? null,
        },
      });
      // Asegura pipRequired=true en la evaluación
      await db.evaluation.update({
        where: { id },
        data: { pipRequired: true },
      });
    }

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: ev.improvementPlan ? "UPDATE_PIP" : "CREATE_PIP",
        entityType: "Evaluation",
        entityId: id,
        details: { deadline: v.deadline, status: v.status ?? "ACTIVO" },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/evaluations/[id]/pip error:", err);
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
    const ev = await db.evaluation.findUnique({
      where: { id },
      include: { improvementPlan: true },
    });
    if (!ev?.improvementPlan) {
      return NextResponse.json({ error: "PIP no existe" }, { status: 404 });
    }
    await db.improvementPlan.delete({ where: { evaluationId: id } });
    await db.evaluation.update({
      where: { id },
      data: { pipRequired: false },
    });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_PIP",
        entityType: "Evaluation",
        entityId: id,
        details: {},
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/evaluations/[id]/pip error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
