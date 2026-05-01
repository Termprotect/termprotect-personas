import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSignedDocUrl } from "@/lib/storage";

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

    const { id } = await params;

    const lr = await db.leaveRequest.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        attachmentUrl: true,
        employee: { select: { reportsToId: true } },
      },
    });
    if (!lr) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }
    if (!lr.attachmentUrl) {
      return NextResponse.json({ error: "Sin adjunto" }, { status: 404 });
    }

    const role = session.user.role;
    const userId = session.user.id;

    let allowed = false;
    if (role === "ADMIN" || role === "RRHH") allowed = true;
    else if (role === "MANAGER") allowed = lr.employee.reportsToId === userId;
    else if (role === "EMPLEADO") allowed = lr.employeeId === userId;

    if (!allowed) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const url = await getSignedDocUrl(lr.attachmentUrl, 60 * 10);

    await db.auditLog.create({
      data: {
        userId,
        action: "VIEW_LEAVE_ATTACHMENT",
        entityType: "LeaveRequest",
        entityId: id,
        details: {},
      },
    });

    return NextResponse.json({ url });
  } catch (err) {
    console.error("GET /api/leave-requests/[id]/attachment error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
