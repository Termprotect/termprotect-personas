import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recomputeLeaveBalance } from "@/lib/services/leave-balance";
import {
  CONSUMES_PERSONAL,
  CONSUMES_VACATION,
} from "@/lib/validators/leave-request";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  reason: z.string().min(3, "Motivo obligatorio (mín. 3 caracteres)").max(500),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const role = session.user.role;
    if (!["ADMIN", "RRHH", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const lr = await db.leaveRequest.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        status: true,
        type: true,
        startDate: true,
        employee: { select: { reportsToId: true } },
      },
    });
    if (!lr) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }
    if (lr.status !== "PENDIENTE") {
      return NextResponse.json(
        { error: "Solo se pueden rechazar solicitudes pendientes" },
        { status: 409 }
      );
    }
    if (role === "MANAGER" && lr.employee.reportsToId !== session.user.id) {
      return NextResponse.json({ error: "Sin permiso sobre este empleado" }, { status: 403 });
    }

    await db.leaveRequest.update({
      where: { id },
      data: {
        status: "RECHAZADA",
        approvedBy: session.user.id,
        approvedAt: new Date(),
        rejectedReason: parsed.data.reason,
      },
    });

    if (CONSUMES_VACATION.includes(lr.type) || CONSUMES_PERSONAL.includes(lr.type)) {
      await recomputeLeaveBalance({
        employeeId: lr.employeeId,
        year: lr.startDate.getUTCFullYear(),
      });
    }

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "REJECT_LEAVE_REQUEST",
        entityType: "LeaveRequest",
        entityId: id,
        details: { reason: parsed.data.reason },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/leave-requests/[id]/reject error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
