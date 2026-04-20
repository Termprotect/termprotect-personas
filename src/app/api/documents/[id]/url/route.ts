import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSignedDocUrl } from "@/lib/storage";

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

    const doc = await db.employeeDocument.findUnique({
      where: { id },
      select: {
        id: true,
        fileUrl: true,
        fileName: true,
        employeeId: true,
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    // Autorización:
    // - ADMIN / RRHH → siempre
    // - MANAGER → solo si el empleado le reporta
    // - EMPLEADO → solo sus propios documentos
    const role = session.user.role;
    const userId = session.user.id;

    let allowed = false;

    if (role === "ADMIN" || role === "RRHH") {
      allowed = true;
    } else if (role === "MANAGER") {
      const emp = await db.employee.findUnique({
        where: { id: doc.employeeId },
        select: { reportsToId: true },
      });
      allowed = emp?.reportsToId === userId;
    } else if (role === "EMPLEADO") {
      allowed = doc.employeeId === userId;
    }

    if (!allowed) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const signedUrl = await getSignedDocUrl(doc.fileUrl, 60 * 10); // 10 min

    // Registrar acceso para auditoría RGPD
    await db.auditLog.create({
      data: {
        userId,
        action: "VIEW_DOCUMENT",
        entityType: "EmployeeDocument",
        entityId: doc.id,
        details: { fileName: doc.fileName, employeeId: doc.employeeId },
      },
    });

    return NextResponse.json({ url: signedUrl });
  } catch (err) {
    console.error("GET /api/documents/[id]/url error:", err);
    return NextResponse.json(
      { error: "No se pudo generar el enlace" },
      { status: 500 }
    );
  }
}
