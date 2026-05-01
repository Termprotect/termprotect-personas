import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  selfReviewSchema,
  managerReviewSchema,
  closeEvaluationSchema,
  computeOverall,
} from "@/lib/validators/evaluation";
import {
  buildDynamicScoreSchema,
  computeTemplateOverall,
  type TemplateQuestion,
} from "@/lib/validators/eval-template";

export const runtime = "nodejs";

type Action = "self" | "manager" | "close";

/** Valida managerScores contra las preguntas de una plantilla dinámica */
function buildDynamicManagerSchema(questions: TemplateQuestion[]) {
  const ids = questions.map((q) => q.id);
  return z.object({
    managerScores: buildDynamicScoreSchema(ids),
    managerComments: z
      .string()
      .max(3000)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    pipRequired: z.coerce.boolean().optional().default(false),
  });
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
    const { id } = await params;
    const e = await db.evaluation.findUnique({
      where: { id },
      include: {
        cycle: { select: { id: true, name: true, status: true, kind: true } },
        employee: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            position: true,
            sede: { select: { name: true } },
            reportsToId: true,
          },
        },
        evaluator: {
          select: { id: true, nombres: true, apellidos: true },
        },
        template: {
          select: { id: true, name: true, questions: true },
        },
        improvementPlan: true,
      },
    });
    if (!e) {
      return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
    }

    const role = session.user.role;
    const userId = session.user.id;
    const isStaff = role === "ADMIN" || role === "RRHH";
    const isOwner = e.employeeId === userId;
    const isEvaluator = e.evaluatorId === userId;
    if (!isStaff && !isOwner && !isEvaluator) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    return NextResponse.json({ evaluation: e });
  } catch (err) {
    console.error("GET /api/evaluations/[id] error:", err);
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
    const { id } = await params;
    const url = new URL(req.url);
    const action = (url.searchParams.get("action") ?? "") as Action;
    if (!["self", "manager", "close"].includes(action)) {
      return NextResponse.json(
        { error: "Acción no válida (self|manager|close)" },
        { status: 400 }
      );
    }

    const ev = await db.evaluation.findUnique({
      where: { id },
      include: {
        cycle: { select: { status: true, kind: true } },
        template: { select: { id: true, questions: true } },
      },
    });
    if (!ev) {
      return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
    }
    if (ev.cycle.status === "CERRADO" && action !== "close") {
      return NextResponse.json(
        { error: "El ciclo está cerrado" },
        { status: 400 }
      );
    }

    const role = session.user.role;
    const userId = session.user.id;
    const isStaff = role === "ADMIN" || role === "RRHH";
    const isOwner = ev.employeeId === userId;
    const isEvaluator = ev.evaluatorId === userId;

    const isPeer = ev.evaluatorType === "PEER";
    const templateQuestions = ev.template
      ? (ev.template.questions as TemplateQuestion[])
      : null;

    const body = await req.json().catch(() => ({}));

    if (action === "self") {
      if (isPeer) {
        return NextResponse.json(
          { error: "La autoevaluación no aplica en ciclos por pares" },
          { status: 400 }
        );
      }
      if (!isOwner) {
        return NextResponse.json({ error: "Solo el empleado puede autoevaluarse" }, { status: 403 });
      }
      if (ev.status !== "PENDIENTE") {
        return NextResponse.json(
          { error: "La autoevaluación ya está completada o bloqueada" },
          { status: 400 }
        );
      }
      const parsed = selfReviewSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
          { status: 400 }
        );
      }
      await db.evaluation.update({
        where: { id },
        data: {
          selfScores: parsed.data.selfScores,
          selfComments: parsed.data.selfComments ?? null,
          status: "AUTOEVALUACION_COMPLETADA",
        },
      });
      await db.auditLog.create({
        data: {
          userId,
          action: "EVAL_SELF_SUBMIT",
          entityType: "Evaluation",
          entityId: id,
          details: {},
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "manager") {
      if (!isEvaluator && !isStaff) {
        return NextResponse.json(
          { error: "Solo el evaluador o RRHH pueden completar la revisión" },
          { status: 403 }
        );
      }
      if (ev.status === "CERRADA") {
        return NextResponse.json(
          { error: "La evaluación está cerrada" },
          { status: 400 }
        );
      }

      let managerScores: Record<string, number>;
      let managerComments: string | undefined;
      let pipRequired = false;
      let overall: number;

      if (templateQuestions) {
        const schema = buildDynamicManagerSchema(templateQuestions);
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
            { status: 400 }
          );
        }
        managerScores = parsed.data.managerScores;
        managerComments = parsed.data.managerComments;
        pipRequired = parsed.data.pipRequired ?? false;
        overall = computeTemplateOverall(
          managerScores,
          templateQuestions.map((q) => q.id)
        );
      } else {
        const parsed = managerReviewSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
            { status: 400 }
          );
        }
        managerScores = parsed.data.managerScores as Record<string, number>;
        managerComments = parsed.data.managerComments;
        pipRequired = parsed.data.pipRequired ?? false;
        overall = computeOverall(parsed.data.managerScores);
      }

      await db.evaluation.update({
        where: { id },
        data: {
          managerScores,
          managerComments: managerComments ?? null,
          pipRequired,
          overallScore: overall,
          status: "MANAGER_COMPLETADA",
        },
      });
      await db.auditLog.create({
        data: {
          userId,
          action: "EVAL_MANAGER_SUBMIT",
          entityType: "Evaluation",
          entityId: id,
          details: { overall, pipRequired, template: !!templateQuestions },
        },
      });
      return NextResponse.json({ ok: true, overall });
    }

    // close
    if (!isStaff) {
      return NextResponse.json({ error: "Solo RRHH puede cerrar" }, { status: 403 });
    }
    if (ev.status === "CERRADA") {
      return NextResponse.json({ ok: true });
    }
    if (ev.status !== "MANAGER_COMPLETADA") {
      return NextResponse.json(
        { error: "Solo se pueden cerrar evaluaciones con revisión manager completada" },
        { status: 400 }
      );
    }
    const parsed = closeEvaluationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    await db.evaluation.update({
      where: { id },
      data: {
        status: "CERRADA",
        pipRequired: parsed.data.pipRequired ?? ev.pipRequired,
      },
    });
    await db.auditLog.create({
      data: {
        userId,
        action: "EVAL_CLOSE",
        entityType: "Evaluation",
        entityId: id,
        details: { pipRequired: parsed.data.pipRequired ?? ev.pipRequired },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/evaluations/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
