import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { peerSetupSchema } from "@/lib/validators/eval-template";

export const runtime = "nodejs";

const EVALUABLE_STATUS = ["ACTIVE", "BAJA_MEDICA", "EXCEDENCIA"] as const;

/**
 * GET: estado actual del setup del ciclo por pares (sujetos + evaluadores).
 */
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

    const cycle = await db.evalCycle.findUnique({
      where: { id },
      select: { id: true, kind: true },
    });
    if (!cycle) {
      return NextResponse.json({ error: "Ciclo no encontrado" }, { status: 404 });
    }
    if (cycle.kind !== "MONTHLY_PEER") {
      return NextResponse.json({ assignments: [] });
    }

    const evals = await db.evaluation.findMany({
      where: { cycleId: id },
      select: {
        id: true,
        employeeId: true,
        evaluatorId: true,
        templateId: true,
        status: true,
      },
    });

    // Agrupar por subject+template
    const map = new Map<
      string,
      {
        subjectId: string;
        templateId: string;
        evaluatorIds: string[];
        statuses: Record<string, number>;
      }
    >();
    for (const e of evals) {
      if (!e.templateId) continue;
      const key = `${e.employeeId}|${e.templateId}`;
      if (!map.has(key)) {
        map.set(key, {
          subjectId: e.employeeId,
          templateId: e.templateId,
          evaluatorIds: [],
          statuses: {},
        });
      }
      const a = map.get(key)!;
      a.evaluatorIds.push(e.evaluatorId);
      a.statuses[e.status] = (a.statuses[e.status] ?? 0) + 1;
    }

    return NextResponse.json({ assignments: Array.from(map.values()) });
  } catch (err) {
    console.error("GET peer-setup error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST: aplica una configuración de peer-setup sobre el ciclo.
 * Por cada assignment crea N evaluaciones (una por evaluador) usando la plantilla indicada.
 * Idempotente: usa skipDuplicates sobre @@unique(cycleId, employeeId, evaluatorId).
 */
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
    const cycle = await db.evalCycle.findUnique({
      where: { id },
      select: { id: true, status: true, kind: true },
    });
    if (!cycle) {
      return NextResponse.json({ error: "Ciclo no encontrado" }, { status: 404 });
    }
    if (cycle.kind !== "MONTHLY_PEER") {
      return NextResponse.json(
        { error: "Este ciclo no es por pares" },
        { status: 400 }
      );
    }
    if (cycle.status === "CERRADO") {
      return NextResponse.json(
        { error: "No puedes modificar un ciclo cerrado" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = peerSetupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const { assignments, activate } = parsed.data;

    // Validar ids
    const subjectIds = Array.from(
      new Set(assignments.map((a) => a.subjectId))
    );
    const evaluatorIds = Array.from(
      new Set(assignments.flatMap((a) => a.evaluatorIds))
    );
    const templateIds = Array.from(
      new Set(assignments.map((a) => a.templateId))
    );

    const [subjects, evaluators, templates] = await Promise.all([
      db.employee.findMany({
        where: {
          id: { in: subjectIds },
          status: { in: [...EVALUABLE_STATUS] },
        },
        select: { id: true },
      }),
      db.employee.findMany({
        where: {
          id: { in: evaluatorIds },
          status: { in: [...EVALUABLE_STATUS] },
        },
        select: { id: true },
      }),
      db.evalTemplate.findMany({
        where: { id: { in: templateIds }, archived: false },
        select: { id: true },
      }),
    ]);

    const okSubjects = new Set(subjects.map((s) => s.id));
    const okEvaluators = new Set(evaluators.map((e) => e.id));
    const okTemplates = new Set(templates.map((t) => t.id));

    const missingSubjects = subjectIds.filter((id) => !okSubjects.has(id));
    const missingEvaluators = evaluatorIds.filter((id) => !okEvaluators.has(id));
    const missingTemplates = templateIds.filter((id) => !okTemplates.has(id));
    if (missingSubjects.length || missingEvaluators.length || missingTemplates.length) {
      return NextResponse.json(
        {
          error:
            "Referencias inválidas: " +
            [
              missingSubjects.length ? `${missingSubjects.length} empleado(s)` : "",
              missingEvaluators.length
                ? `${missingEvaluators.length} evaluador(es)`
                : "",
              missingTemplates.length
                ? `${missingTemplates.length} plantilla(s)`
                : "",
            ]
              .filter(Boolean)
              .join(", "),
        },
        { status: 400 }
      );
    }

    // No permitir que alguien se evalúe a sí mismo como PEER
    for (const a of assignments) {
      if (a.evaluatorIds.includes(a.subjectId)) {
        return NextResponse.json(
          {
            error:
              "Un empleado no puede evaluarse a sí mismo como par (revisa los evaluadores).",
          },
          { status: 400 }
        );
      }
    }

    // Construir rows a insertar
    const rows = assignments.flatMap((a) =>
      a.evaluatorIds.map((eid) => ({
        cycleId: id,
        employeeId: a.subjectId,
        evaluatorId: eid,
        evaluatorType: "PEER" as const,
        templateId: a.templateId,
        status: "PENDIENTE" as const,
      }))
    );

    const result =
      rows.length > 0
        ? await db.evaluation.createMany({
            data: rows,
            skipDuplicates: true,
          })
        : { count: 0 };

    if (activate && cycle.status === "BORRADOR") {
      await db.evalCycle.update({
        where: { id },
        data: { status: "ACTIVO" },
      });
    }

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PEER_SETUP_EVAL_CYCLE",
        entityType: "EvalCycle",
        entityId: id,
        details: {
          assignments: assignments.length,
          requested: rows.length,
          created: result.count,
          skipped: rows.length - result.count,
          activated: activate,
        },
      },
    });

    return NextResponse.json({
      requested: rows.length,
      created: result.count,
      skipped: rows.length - result.count,
    });
  } catch (err) {
    console.error("POST peer-setup error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE: elimina una evaluación específica del setup (?evaluationId=...)
 * Solo si sigue en PENDIENTE. Útil para retirar un evaluador asignado por error.
 */
export async function DELETE(
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
    const { searchParams } = new URL(req.url);
    const evaluationId = searchParams.get("evaluationId");
    if (!evaluationId) {
      return NextResponse.json(
        { error: "Falta evaluationId" },
        { status: 400 }
      );
    }

    const ev = await db.evaluation.findUnique({
      where: { id: evaluationId },
      select: { id: true, cycleId: true, status: true },
    });
    if (!ev || ev.cycleId !== id) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    if (ev.status !== "PENDIENTE") {
      return NextResponse.json(
        { error: "Solo se pueden retirar evaluaciones pendientes" },
        { status: 400 }
      );
    }

    await db.evaluation.delete({ where: { id: evaluationId } });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PEER_SETUP_REMOVE_EVALUATION",
        entityType: "Evaluation",
        entityId: evaluationId,
        details: { cycleId: id },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE peer-setup error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
