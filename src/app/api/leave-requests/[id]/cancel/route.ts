import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recomputeLeaveBalance } from "@/lib/services/leave-balance";
import {
  CONSUMES_PERSONAL,
  CONSUMES_VACATION,
} from "@/lib/validators/leave-request";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const { id } = await params;

    const lr = await db.leaveRequest.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        status: true,
        type: true,
        startDate: true,
      },
    });
    if (!lr) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }
    if (lr.employeeId !== session.user.id) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
    if (lr.status !== "PENDIENTE") {
      return NextResponse.json(
        { error: "Solo se pueden cancelar solicitudes pendientes" },
        { status: 409 }
      );
    }

    await db.leaveRequest.update({
      where: { id },
      data: { status: "CANCELADA" },
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
        action: "CANCEL_LEAVE_REQUEST",
        entityType: "LeaveRequest",
        entityId: id,
        details: {},
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/leave-requests/[id]/cancel error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
