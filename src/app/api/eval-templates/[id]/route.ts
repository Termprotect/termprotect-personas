import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { evalTemplateUpdateSchema } from "@/lib/validators/eval-template";

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
    if (!["ADMIN", "RRHH", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const { id } = await params;
    const t = await db.evalTemplate.findUnique({
      where: { id },
      include: { _count: { select: { evaluations: true } } },
    });
    if (!t) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    return NextResponse.json({
      id: t.id,
      name: t.name,
      description: t.description,
      questions: t.questions,
      archived: t.archived,
      usage: t._count.evaluations,
    });
  } catch (err) {
    console.error("GET /api/eval-templates/[id] error:", err);
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
    const existing = await db.evalTemplate.findUnique({
      where: { id },
      include: { _count: { select: { evaluations: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = evalTemplateUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    // Si ya se han generado evaluaciones con esta plantilla, no permitir
    // cambiar el set de preguntas (rompería respuestas antiguas).
    if (parsed.data.questions && existing._count.evaluations > 0) {
      return NextResponse.json(
        {
          error:
            "No puedes cambiar las preguntas: la plantilla ya tiene evaluaciones. Archívala y crea una nueva.",
        },
        { status: 400 }
      );
    }

    await db.evalTemplate.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description }
          : {}),
        ...(parsed.data.questions !== undefined
          ? { questions: parsed.data.questions }
          : {}),
        ...(parsed.data.archived !== undefined
          ? { archived: parsed.data.archived }
          : {}),
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_EVAL_TEMPLATE",
        entityType: "EvalTemplate",
        entityId: id,
        details: parsed.data,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/eval-templates/[id] error:", err);
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
    const t = await db.evalTemplate.findUnique({
      where: { id },
      include: { _count: { select: { evaluations: true } } },
    });
    if (!t) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    if (t._count.evaluations > 0) {
      return NextResponse.json(
        { error: "Esta plantilla tiene evaluaciones. Archívala en su lugar." },
        { status: 400 }
      );
    }

    await db.evalTemplate.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_EVAL_TEMPLATE",
        entityType: "EvalTemplate",
        entityId: id,
        details: { name: t.name },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/eval-templates/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
