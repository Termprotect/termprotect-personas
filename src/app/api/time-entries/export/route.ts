import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { monthRange } from "@/lib/time";
import { buildJornadaReport } from "@/lib/pdf/jornada-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPRESA = {
  nombre: "XTRU Europea PVC / Termprotect",
  cif: null as string | null, // rellenar si procede
};

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const role = session.user.role;

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const month = searchParams.get("month");

    if (!employeeId || !month) {
      return NextResponse.json(
        { error: "Faltan parámetros employeeId y month" },
        { status: 400 }
      );
    }

    // Autorización
    if (role === "EMPLEADO" && employeeId !== session.user.id) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
    if (role === "MANAGER" && employeeId !== session.user.id) {
      const emp = await db.employee.findUnique({
        where: { id: employeeId },
        select: { reportsToId: true },
      });
      if (!emp || emp.reportsToId !== session.user.id) {
        return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
      }
    }

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: { sede: { select: { name: true } } },
    });
    if (!employee) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 }
      );
    }

    const { start, end, label } = monthRange(month);

    const [entries, holidays] = await Promise.all([
      db.timeEntry.findMany({
        where: {
          employeeId,
          date: { gte: start, lt: end },
        },
        orderBy: { date: "asc" },
      }),
      db.sedeCalendar.findMany({
        where: {
          sedeId: employee.sedeId,
          date: { gte: start, lt: end },
        },
      }),
    ]);

    const pdf = await buildJornadaReport({
      empresa: EMPRESA,
      empleado: {
        nombres: employee.nombres,
        apellidos: employee.apellidos,
        documentType: employee.documentType,
        documentNumber: employee.documentNumber,
        sedeName: employee.sede.name,
        position: employee.position,
        socialSecurityNumber: employee.socialSecurityNumber,
      },
      monthLabel: label,
      monthRange: { start, end },
      entries: entries.map((e) => ({
        id: e.id,
        date: e.date,
        clockIn: e.clockIn,
        clockOut: e.clockOut,
        breakMinutes: e.breakMinutes,
        breakStartedAt: e.breakStartedAt,
        source: e.source,
        isManual: e.isManual,
        manualReason: e.manualReason,
      })),
      holidays: holidays.map((h) => ({
        date: h.date,
        description: h.description,
      })),
      generatedBy: session.user.email ?? session.user.id,
      generatedAt: new Date(),
    });

    // Auditoría
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "EXPORT_TIME_ENTRIES",
        entityType: "Employee",
        entityId: employee.id,
        details: { month },
      },
    });

    const filename = `jornada_${employee.documentNumber}_${month}.pdf`;

    // Copiamos a un Uint8Array "propio" para evitar problemas de ArrayBuffer
    // compartido entre el Buffer de Node y el body de Response.
    const body = new Uint8Array(pdf);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/time-entries/export error:", err);
    const msg =
      err instanceof Error ? err.message : "Error interno generando el PDF";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
