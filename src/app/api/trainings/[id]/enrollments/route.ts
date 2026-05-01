import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bulkEnrollSchema } from "@/lib/validators/enrollment";

export const runtime = "nodejs";

// Inscribir uno o varios empleados en una formación
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
    const { id: trainingId } = await params;

    const training = await db.training.findUnique({
      where: { id: trainingId },
      select: { id: true, title: true },
    });
    if (!training) {
      return NextResponse.json(
        { error: "Formación no encontrada" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = bulkEnrollSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const employees = await db.employee.findMany({
      where: { id: { in: parsed.data.employeeIds } },
      select: { id: true },
    });
    const validIds = new Set(employees.map((e) => e.id));
    const data = parsed.data.employeeIds
      .filter((id) => validIds.has(id))
      .map((employeeId) => ({
        trainingId,
        employeeId,
        status: "INSCRITO" as const,
      }));

    if (data.length === 0) {
      return NextResponse.json({ error: "Empleados no válidos" }, { status: 400 });
    }

    const result = await db.trainingEnrollment.createMany({
      data,
      skipDuplicates: true,
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ENROLL_TRAINING",
        entityType: "Training",
        entityId: trainingId,
        details: { count: result.count, requested: data.length },
      },
    });

    return NextResponse.json({
      created: result.count,
      skipped: data.length - result.count,
    });
  } catch (err) {
    console.error("POST /api/trainings/[id]/enrollments error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
