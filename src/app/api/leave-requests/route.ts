import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  leaveRequestSchema,
  parseDateOnly,
  CONSUMES_VACATION,
  CONSUMES_PERSONAL,
  REQUIRES_ATTACHMENT,
} from "@/lib/validators/leave-request";
import {
  countBusinessDays,
  eachDayUtc,
  toUtcDate,
} from "@/lib/services/business-days";
import {
  ensureLeaveBalance,
  recomputeLeaveBalance,
} from "@/lib/services/leave-balance";
import {
  uploadDocument,
  isValidDocMime,
  MAX_DOC_SIZE_MB,
} from "@/lib/storage";

export const runtime = "nodejs";

// ─── GET: listar mis solicitudes ────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const url = new URL(req.url);
    const yearParam = url.searchParams.get("year");
    const year = yearParam
      ? parseInt(yearParam, 10)
      : new Date().getUTCFullYear();

    const yStart = new Date(Date.UTC(year, 0, 1));
    const yEnd = new Date(Date.UTC(year, 11, 31));

    const rows = await db.leaveRequest.findMany({
      where: {
        employeeId: session.user.id,
        startDate: { lte: yEnd },
        endDate: { gte: yStart },
      },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        totalDays: true,
        status: true,
        notes: true,
        rejectedReason: true,
        attachmentUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ items: rows });
  } catch (err) {
    console.error("GET /api/leave-requests error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── POST: crear solicitud ──────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Aceptar tanto FormData (con adjunto) como JSON
    const contentType = req.headers.get("content-type") ?? "";
    let payload: Record<string, unknown> = {};
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      payload = {
        type: form.get("type"),
        startDate: form.get("startDate"),
        endDate: form.get("endDate"),
        notes: form.get("notes") ?? undefined,
      };
      const f = form.get("file");
      if (f && f instanceof File && f.size > 0) {
        file = f;
      }
    } else {
      payload = await req.json();
    }

    const parsed = leaveRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const { type, startDate, endDate, notes } = parsed.data;

    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);

    // No solicitudes con inicio en el pasado (salvo IT)
    const todayUtc = toUtcDate(new Date());
    if (type !== "INCAPACIDAD_TEMPORAL" && start.getTime() < todayUtc.getTime()) {
      return NextResponse.json(
        { error: "La fecha de inicio no puede estar en el pasado" },
        { status: 400 }
      );
    }

    // Adjunto obligatorio para ciertos tipos
    if (REQUIRES_ATTACHMENT.includes(type) && !file) {
      return NextResponse.json(
        { error: "Este tipo de permiso requiere justificante adjunto" },
        { status: 400 }
      );
    }

    const employee = await db.employee.findUnique({
      where: { id: session.user.id },
      select: { id: true, sedeId: true, status: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }
    // Bloqueamos solo los estados que no pueden solicitar
    const BLOCKED = new Set(["INVITADO", "BAJA_VOLUNTARIA", "DESPIDO"]);
    if (BLOCKED.has(employee.status)) {
      return NextResponse.json(
        { error: "Tu cuenta no puede crear solicitudes en este momento" },
        { status: 403 }
      );
    }

    // Detectar solapamiento con otras solicitudes no rechazadas/canceladas
    const overlapping = await db.leaveRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ["PENDIENTE", "APROBADA"] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { id: true, startDate: true, endDate: true },
    });
    if (overlapping) {
      return NextResponse.json(
        {
          error: `Ya tienes una solicitud que se solapa (${
            overlapping.startDate.toISOString().slice(0, 10)
          } → ${overlapping.endDate.toISOString().slice(0, 10)})`,
        },
        { status: 409 }
      );
    }

    // Cálculo de días según tipo:
    // - Para VACACIONES y ASUNTOS PROPIOS → días laborables descontando festivos
    // - Para el resto → también laborables, salvo IT y excedencias que cuentan naturales
    const countNaturalTypes = new Set([
      "INCAPACIDAD_TEMPORAL",
      "EXCEDENCIA_VOLUNTARIA",
      "EXCEDENCIA_HIJOS",
      "EXCEDENCIA_FAMILIARES",
      "PERMISO_LACTANCIA",
    ]);
    let totalDays = 0;
    if (countNaturalTypes.has(type)) {
      totalDays = eachDayUtc(start, end).length;
    } else {
      totalDays = await countBusinessDays({
        sedeId: employee.sedeId,
        from: start,
        to: end,
      });
      // Si las fechas son L-V y todas son festivos, totalDays será 0 → error
      if (totalDays === 0) {
        return NextResponse.json(
          { error: "El rango seleccionado no tiene días laborables (todos son fin de semana o festivos)" },
          { status: 400 }
        );
      }
    }

    // Validar saldo para VACACIONES y ASUNTOS PROPIOS
    const year = start.getUTCFullYear();
    if (CONSUMES_VACATION.includes(type) || CONSUMES_PERSONAL.includes(type)) {
      const balance = await ensureLeaveBalance({
        employeeId: employee.id,
        sedeId: employee.sedeId,
        year,
      });
      if (CONSUMES_VACATION.includes(type)) {
        const disponible =
          balance.totalDays - balance.usedDays - balance.pendingDays;
        if (totalDays > disponible) {
          return NextResponse.json(
            {
              error: `Saldo de vacaciones insuficiente. Disponible: ${disponible} día(s), solicitados: ${totalDays}`,
            },
            { status: 400 }
          );
        }
      }
      if (CONSUMES_PERSONAL.includes(type)) {
        const disponible =
          balance.personalTotal -
          balance.personalUsed -
          balance.personalPending;
        if (totalDays > disponible) {
          return NextResponse.json(
            {
              error: `Saldo de asuntos propios insuficiente. Disponible: ${disponible} día(s), solicitados: ${totalDays}`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Subir adjunto si existe
    let attachmentUrl: string | undefined;
    if (file) {
      if (!isValidDocMime(file.type)) {
        return NextResponse.json(
          { error: "Formato de adjunto no válido (JPG, PNG, WEBP o PDF)" },
          { status: 400 }
        );
      }
      if (file.size > MAX_DOC_SIZE_MB * 1024 * 1024) {
        return NextResponse.json(
          { error: `El adjunto supera los ${MAX_DOC_SIZE_MB} MB` },
          { status: 400 }
        );
      }
      const buffer = await file.arrayBuffer();
      const { path } = await uploadDocument({
        employeeId: employee.id,
        kind: "leave",
        buffer,
        contentType: file.type,
        originalName: file.name,
      });
      attachmentUrl = path;
    }

    const created = await db.leaveRequest.create({
      data: {
        employeeId: employee.id,
        type,
        startDate: start,
        endDate: end,
        totalDays,
        status: "PENDIENTE",
        notes: notes ?? null,
        attachmentUrl: attachmentUrl ?? null,
      },
      select: { id: true },
    });

    // Actualizar saldo si aplica
    if (CONSUMES_VACATION.includes(type) || CONSUMES_PERSONAL.includes(type)) {
      await recomputeLeaveBalance({ employeeId: employee.id, year });
    }

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_LEAVE_REQUEST",
        entityType: "LeaveRequest",
        entityId: created.id,
        details: { type, startDate, endDate, totalDays },
      },
    });

    return NextResponse.json({ id: created.id, totalDays });
  } catch (err) {
    console.error("POST /api/leave-requests error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

