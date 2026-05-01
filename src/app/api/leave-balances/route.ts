import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaveBalanceUpdateSchema } from "@/lib/validators/leave-balance";
import { recomputeLeaveBalance } from "@/lib/services/leave-balance";

export const runtime = "nodejs";

// Upsert del saldo (ajuste manual por RRHH/ADMIN)
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const role = session.user.role;
    if (!["ADMIN", "RRHH"].includes(role)) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = leaveBalanceUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const { employeeId, year, totalDays, personalTotal } = parsed.data;

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, sedeId: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    const saved = await db.leaveBalance.upsert({
      where: { employeeId_year: { employeeId, year } },
      update: { totalDays, personalTotal, sedeId: employee.sedeId },
      create: {
        employeeId,
        sedeId: employee.sedeId,
        year,
        totalDays,
        personalTotal,
      },
    });

    // Recomputar usados/pendientes en base a solicitudes existentes
    const updated = await recomputeLeaveBalance({ employeeId, year });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_LEAVE_BALANCE",
        entityType: "LeaveBalance",
        entityId: saved.id,
        details: { year, totalDays, personalTotal },
      },
    });

    return NextResponse.json({ balance: updated ?? saved });
  } catch (err) {
    console.error("PUT /api/leave-balances error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
