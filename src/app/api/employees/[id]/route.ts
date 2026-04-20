import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  updateEmployeeSchema,
  TRACKED_FIELDS,
  type TrackedField,
} from "@/lib/validators/employee-update";

export async function PATCH(
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

    const current = await db.employee.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos no válidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Si cambia la sede o el jefe, validar que existan
    if (data.sedeId !== current.sedeId) {
      const sede = await db.sede.findUnique({ where: { id: data.sedeId } });
      if (!sede) {
        return NextResponse.json({ error: "Sede no válida" }, { status: 400 });
      }
    }
    if (data.reportsToId && data.reportsToId === id) {
      return NextResponse.json(
        { error: "Un empleado no puede reportarse a sí mismo" },
        { status: 400 }
      );
    }
    if (data.reportsToId) {
      const manager = await db.employee.findUnique({
        where: { id: data.reportsToId },
        select: { id: true },
      });
      if (!manager) {
        return NextResponse.json({ error: "Jefe directo no válido" }, { status: 400 });
      }
    }

    // Preparar payload (mapear strings ISO a Date donde toca)
    const updatePayload = {
      nombres: data.nombres,
      apellidos: data.apellidos,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      sedeId: data.sedeId,
      position: data.position,
      department: data.department ?? null,
      reportsToId: data.reportsToId ?? null,
      contractType: data.contractType,
      workMode: data.workMode,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      socialSecurityNumber: data.socialSecurityNumber ?? null,
      role: data.role,
      requiresDriving: data.requiresDriving,
      bankAccountHolder: data.bankAccountHolder ?? null,
      iban: data.iban ?? null,
      drivingLicenseNumber: data.requiresDriving
        ? data.drivingLicenseNumber ?? null
        : null,
      drivingLicenseCategory: data.requiresDriving
        ? data.drivingLicenseCategory ?? null
        : null,
      drivingLicenseExpiresAt:
        data.requiresDriving && data.drivingLicenseExpiresAt
          ? new Date(data.drivingLicenseExpiresAt)
          : null,
      capNumber: null,
      capExpiresAt: null,
    };

    // Calcular diffs de campos rastreables → EmployeeHistory
    const historyEntries: {
      field: TrackedField;
      oldValue: string | null;
      newValue: string | null;
    }[] = [];

    for (const field of TRACKED_FIELDS) {
      const prev = (current as Record<string, unknown>)[field];
      const next = (updatePayload as Record<string, unknown>)[field];
      if (!isEqual(prev, next)) {
        historyEntries.push({
          field,
          oldValue: stringify(prev),
          newValue: stringify(next),
        });
      }
    }

    // Ejecutar update + history + audit en transacción
    await db.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: updatePayload,
      });

      if (historyEntries.length > 0) {
        await tx.employeeHistory.createMany({
          data: historyEntries.map((h) => ({
            employeeId: id,
            field: h.field,
            oldValue: h.oldValue,
            newValue: h.newValue,
            changedBy: actorId,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "EDIT_EMPLOYEE",
          entityType: "Employee",
          entityId: id,
          details: {
            trackedChanges: historyEntries.length,
            fields: historyEntries.map((h) => h.field),
          },
        },
      });
    });

    return NextResponse.json({
      ok: true,
      trackedChanges: historyEntries.length,
    });
  } catch (err) {
    console.error("PATCH /api/employees/[id] error:", err);
    return NextResponse.json(
      { error: "No se pudo actualizar el empleado" },
      { status: 500 }
    );
  }
}

function isEqual(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof Date) return false;
  if (b instanceof Date) return false;
  return a === b;
}

function stringify(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}
