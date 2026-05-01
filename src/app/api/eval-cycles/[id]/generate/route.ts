import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// Solo empleados activos o en BAJA_MEDICA/EXCEDENCIA participan en evaluaciones
const EVALUABLE_STATUS = ["ACTIVE", "BAJA_MEDICA", "EXCEDENCIA"] as const;

/**
 * POST /api/eval-cycles/[id]/generate
 * body: { sedeId?, department?, activate?: boolean }
 * Crea una evaluación por cada empleado activo, con evaluator = reportsToId si existe,
 * o fallback al primer usuario RRHH. Si activate=true, pasa el ciclo a ACTIVO.
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
    if (cycle.status === "CERRADO") {
      return NextResponse.json(
        { error: "No se puede generar en un ciclo cerrado" },
        { status: 400 }
      );
    }
    if (cycle.kind !== "ANNUAL") {
      return NextResponse.json(
        { error: "Este endpoint solo aplica a ciclos anuales. Usa peer-setup para ciclos por pares." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const sedeId: string | undefined = body.sedeId;
    const department: string | undefined = body.department;
    const activate = !!body.activate;

    const employees = await db.employee.findMany({
      where: {
        status: { in: [...EVALUABLE_STATUS] },
        ...(sedeId ? { sedeId } : {}),
        ...(department ? { department } : {}),
      },
      select: { id: true, reportsToId: true },
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { error: "No hay empleados elegibles con estos filtros" },
        { status: 400 }
      );
    }

    // Fallback evaluator: primer usuario RRHH o ADMIN
    const fallback = await db.employee.findFirst({
      where: { role: { in: ["RRHH", "ADMIN"] }, status: "ACTIVE" },
      select: { id: true },
    });
    const fallbackId = fallback?.id ?? session.user.id;

    // Evaluaciones existentes en el ciclo (para no duplicar)
    const existing = await db.evaluation.findMany({
      where: { cycleId: id, employeeId: { in: employees.map((e) => e.id) } },
      select: { employeeId: true },
    });
    const alreadyIds = new Set(existing.map((e) => e.employeeId));

    const toCreate = employees
      .filter((e) => !alreadyIds.has(e.id))
      .map((e) => ({
        cycleId: id,
        employeeId: e.id,
        evaluatorId: e.reportsToId ?? fallbackId,
        evaluatorType: "MANAGER" as const,
        status: "PENDIENTE" as const,
      }));

    const result =
      toCreate.length > 0
        ? await db.evaluation.createMany({ data: toCreate, skipDuplicates: true })
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
        action: "GENERATE_EVALUATIONS",
        entityType: "EvalCycle",
        entityId: id,
        details: {
          created: result.count,
          skipped: employees.length - result.count,
          activated: activate,
          sedeId: sedeId ?? null,
          department: department ?? null,
        },
      },
    });

    return NextResponse.json({
      created: result.count,
      skipped: employees.length - result.count,
      total: employees.length,
    });
  } catch (err) {
    console.error("POST /api/eval-cycles/[id]/generate error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
