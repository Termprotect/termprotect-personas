import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createEmployeeSchema } from "@/lib/validators/employee";
import { sendEmail } from "@/lib/email";
import { invitationEmail } from "@/lib/email-templates/invitation";

const INVITATION_EXPIRES_DAYS = 7;

export const POST = auth(async function POST(req) {
  try {
    // Solo ADMIN o RRHH pueden crear empleados
    const role = req.auth?.user?.role;
    const userId = req.auth?.user?.id;
    if (!userId || (role !== "ADMIN" && role !== "RRHH")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos no válidos", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verificar duplicado por documento
    const existing = await db.employee.findUnique({
      where: { documentNumber: data.documentNumber },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un empleado con ese número de documento" },
        { status: 409 }
      );
    }

    // Verificar que la sede existe
    const sede = await db.sede.findUnique({ where: { id: data.sedeId } });
    if (!sede) {
      return NextResponse.json({ error: "Sede no válida" }, { status: 400 });
    }

    // Verificar jefe directo si viene
    if (data.reportsToId) {
      const manager = await db.employee.findUnique({
        where: { id: data.reportsToId },
        select: { id: true },
      });
      if (!manager) {
        return NextResponse.json({ error: "Jefe directo no válido" }, { status: 400 });
      }
    }

    // Generar token de invitación
    const invitationToken = randomBytes(32).toString("hex");
    const invitationTokenExpiresAt = new Date(
      Date.now() + INVITATION_EXPIRES_DAYS * 24 * 60 * 60 * 1000
    );

    const employee = await db.employee.create({
      data: {
        nombres: data.nombres,
        apellidos: data.apellidos,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        email: data.email,
        phone: data.phone,
        sedeId: data.sedeId,
        position: data.position,
        department: data.department,
        reportsToId: data.reportsToId || null,
        contractType: data.contractType,
        startDate: new Date(data.startDate),
        socialSecurityNumber: data.socialSecurityNumber,
        role: data.role,
        requiresDriving: data.requiresDriving,
        status: "INVITADO",
        passwordHash: null,
        mustChangePassword: false,
        invitationToken,
        invitationTokenExpiresAt,
        invitationSentAt: new Date(),
      },
      select: { id: true, nombres: true, apellidos: true, email: true },
    });

    // Registrar auditoría
    await db.auditLog.create({
      data: {
        userId,
        action: "CREATE_EMPLOYEE",
        entityType: "Employee",
        entityId: employee.id,
        details: {
          nombres: employee.nombres,
          apellidos: employee.apellidos,
          email: employee.email,
        },
        ipAddress:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          req.headers.get("x-real-ip") ??
          undefined,
      },
    });

    // Enviar email de invitación
    const baseUrl =
      process.env.NEXTAUTH_URL ??
      req.headers.get("origin") ??
      "http://localhost:3000";
    const activationUrl = `${baseUrl}/activar/${invitationToken}`;

    const emailContent = invitationEmail({
      nombres: employee.nombres,
      apellidos: employee.apellidos,
      activationUrl,
      expiresInDays: INVITATION_EXPIRES_DAYS,
    });

    try {
      await sendEmail({
        to: employee.email!,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (emailErr) {
      // El empleado se creó, pero el email falló. Devolvemos 201 con aviso.
      console.error("Error enviando email de invitación:", emailErr);
      return NextResponse.json(
        {
          id: employee.id,
          warning:
            "Empleado creado pero el email de invitación no pudo enviarse. Puedes reenviarlo desde la ficha.",
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ id: employee.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/employees error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}) as (req: NextRequest) => Promise<NextResponse>;
