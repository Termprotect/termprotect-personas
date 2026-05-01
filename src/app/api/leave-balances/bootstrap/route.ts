import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaveBalanceBootstrapSchema } from "@/lib/validators/leave-balance";

export const runtime = "nodejs";

// Crea saldos del año para empleados activos que aún no lo tienen,
// usando SedePolicy del año (o sede.vacationDays como fallback).
export async function POST(req: NextRequest) {
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
    const parsed = leaveBalanceBootstrapSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const { year, sedeId } = parsed.data;

    // Empleados activos (no invitados / no bajas)
    const employees = await db.employee.findMany({
      where: {
        status: { in: ["ACTIVE", "BAJA_MEDICA", "EXCEDENCIA"] },
        ...(sedeId ? { sedeId } : {}),
      },
      select: { id: true, sedeId: true },
    });

    const sedePolicies = await db.sedePolicy.findMany({
      where: { year, ...(sedeId ? { sedeId } : {}) },
      select: {
        sedeId: true,
        vacationDays: true,
        extraPersonalDays: true,
      },
    });
    const policyMap = new Map(sedePolicies.map((p) => [p.sedeId, p]));

    const sedes = await db.sede.findMany({
      select: { id: true, vacationDays: true },
    });
    const sedeMap = new Map(sedes.map((s) => [s.id, s]));

    const existing = await db.leaveBalance.findMany({
      where: {
        year,
        employeeId: { in: employees.map((e) => e.id) },
      },
      select: { employeeId: true },
    });
    const alreadyHas = new Set(existing.map((e) => e.employeeId));

    const toCreate = employees.filter((e) => !alreadyHas.has(e.id));

    if (toCreate.length === 0) {
      return NextResponse.json({ created: 0, skipped: employees.length });
    }

    const data = toCreate.map((e) => {
      const policy = policyMap.get(e.sedeId);
      const totalDays =
        policy?.vacationDays ?? sedeMap.get(e.sedeId)?.vacationDays ?? 22;
      const personalTotal = policy?.extraPersonalDays ?? 0;
      return {
        employeeId: e.id,
        sedeId: e.sedeId,
        year,
        totalDays,
        usedDays: 0,
        pendingDays: 0,
        personalTotal,
        personalUsed: 0,
        personalPending: 0,
      };
    });

    const result = await db.leaveBalance.createMany({
      data,
      skipDuplicates: true,
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "BOOTSTRAP_LEAVE_BALANCES",
        entityType: "LeaveBalance",
        entityId: null,
        details: { year, sedeId: sedeId ?? null, created: result.count },
      },
    });

    return NextResponse.json({
      created: result.count,
      skipped: employees.length - result.count,
    });
  } catch (err) {
    console.error("POST /api/leave-balances/bootstrap error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
