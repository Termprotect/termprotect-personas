import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { invitationEmail } from "@/lib/email-templates/invitation";

const INVITATION_EXPIRES_DAYS = 7;

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

    const employee = await db.employee.findUnique({
      where: { id },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        email: true,
        status: true,
      },
    });
    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }
    if (employee.status !== "INVITADO") {
      return NextResponse.json(
        { error: "Solo se puede reenviar a empleados en estado INVITADO" },
        { status: 400 }
      );
    }
    if (!employee.email) {
      return NextResponse.json(
        { error: "El empleado no tiene email registrado" },
        { status: 400 }
      );
    }

    // Regenerar token para invalidar el anterior
    const invitationToken = randomBytes(32).toString("hex");
    const invitationTokenExpiresAt = new Date(
      Date.now() + INVITATION_EXPIRES_DAYS * 24 * 60 * 60 * 1000
    );

    await db.employee.update({
      where: { id },
      data: {
        invitationToken,
        invitationTokenExpiresAt,
        invitationSentAt: new Date(),
      },
    });

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
        to: employee.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (emailErr) {
      console.error("Error reenviando invitación:", emailErr);
      return NextResponse.json(
        { error: "Token regenerado pero el email no pudo enviarse" },
        { status: 502 }
      );
    }

    await db.auditLog.create({
      data: {
        userId: actorId,
        action: "RESEND_INVITATION",
        entityType: "Employee",
        entityId: id,
        details: { email: employee.email },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/employees/[id]/resend-invitation error:", err);
    return NextResponse.json(
      { error: "No se pudo reenviar la invitación" },
      { status: 500 }
    );
  }
}
