import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const statusSchema = z.object({
  status: z.enum([
    "ACTIVE",
    "BAJA_MEDICA",
    "EXCEDENCIA",
    "BAJA_VOLUNTARIA",
    "DESPIDO",
  ]),
  effectiveDate: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), "Fecha no válida"),
  reason: z.string().trim().max(500).optional(),
});

// Estados que requieren motivo obligatorio
const REQUIRES_REASON = new Set(["BAJA_VOLUNTARIA", "DESPIDO", "EXCEDENCIA"]);

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
    if (role !== "ADMIN" && role !== "RRHH") {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
    const actorId = session.user.id;

    const { id } = await params;

    const current = await db.employee.findUnique({
      where: { id },
      select: { id: true, status: true, contractType: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }
    if (current.status === "INVITADO") {
      return NextResponse.json(
        { error: "El empleado aún no ha activado su cuenta" },
        { status: 400 }
      );
    }

    const parsed = statusSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos no válidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { status, effectiveDate, reason } = parsed.data;

    if (status === current.status) {
      return NextResponse.json(
        { error: "El empleado ya tiene ese estado" },
        { status: 400 }
      );
    }

    if (REQUIRES_REASON.has(status) && !reason) {
      return NextResponse.json(
        { error: "Indica el motivo del cambio" },
        { status: 400 }
      );
    }

    // Para bajas definitivas, guardar fecha de fin
    const dataUpdate: {
      status: typeof status;
      endDate?: Date;
    } = { status };
    if (status === "BAJA_VOLUNTARIA" || status === "DESPIDO") {
      dataUpdate.endDate = new Date(effectiveDate);
    }

    await db.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: dataUpdate,
      });

      await tx.employeeHistory.create({
        data: {
          employeeId: id,
          field: "status",
          oldValue: current.status,
          newValue: status,
          changedBy: actorId,
          reason: reason ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "CHANGE_STATUS",
          entityType: "Employee",
          entityId: id,
          details: { from: current.status, to: status, effectiveDate, reason },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/employees/[id]/status error:", err);
    return NextResponse.json(
      { error: "No se pudo cambiar el estado" },
      { status: 500 }
    );
  }
}
