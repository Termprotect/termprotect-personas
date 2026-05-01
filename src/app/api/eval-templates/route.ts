import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { evalTemplateCreateSchema } from "@/lib/validators/eval-template";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!["ADMIN", "RRHH", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("archived") === "1";

    const templates = await db.evalTemplate.findMany({
      where: includeArchived ? {} : { archived: false },
      orderBy: [{ archived: "asc" }, { name: "asc" }],
      include: { _count: { select: { evaluations: true } } },
    });

    const items = templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      questions: t.questions,
      archived: t.archived,
      usage: t._count.evaluations,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/eval-templates error:", err);
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
    const parsed = evalTemplateCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const { name, description, questions } = parsed.data;

    const created = await db.evalTemplate.create({
      data: {
        name,
        description,
        questions,
        createdBy: session.user.id,
      },
      select: { id: true },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_EVAL_TEMPLATE",
        entityType: "EvalTemplate",
        entityId: created.id,
        details: { name, questionCount: questions.length },
      },
    });

    return NextResponse.json({ id: created.id });
  } catch (err) {
    console.error("POST /api/eval-templates error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
