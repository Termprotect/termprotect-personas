import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollmentUpdateSchema } from "@/lib/validators/enrollment";

export const runtime = "nodejs";

function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
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
    const parsed = enrollmentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const v = parsed.data;

    const existing = await db.trainingEnrollment.findUnique({
      where: { id },
      select: { id: true, trainingId: true, employeeId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
    }

    await db.trainingEnrollment.update({
      where: { id },
      data: {
        status: v.status,
        completedAt:
          v.status === "COMPLETADO" && v.completedAt
            ? parseDateOnly(v.completedAt)
            : v.status === "COMPLETADO"
              ? undefined
              : null,
        hoursCompleted:
          v.status === "COMPLETADO" ? v.hoursCompleted ?? null : null,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_ENROLLMENT",
        entityType: "TrainingEnrollment",
        entityId: id,
        details: { status: v.status },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/enrollments/[id] error:", err);
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

    const existing = await db.trainingEnrollment.findUnique({
      where: { id },
      select: { id: true, trainingId: true, employeeId: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
    }

    await db.trainingEnrollment.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_ENROLLMENT",
        entityType: "TrainingEnrollment",
        entityId: id,
        details: { trainingId: existing.trainingId, employeeId: existing.employeeId },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/enrollments/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
