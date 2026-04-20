import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  activationSchema,
  CLAUSULA_VERSION,
} from "@/lib/validators/activation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const employee = await db.employee.findUnique({
      where: { invitationToken: token },
      select: {
        id: true,
        status: true,
        invitationTokenExpiresAt: true,
        requiresDriving: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Enlace de invitación no válido" },
        { status: 404 }
      );
    }
    if (employee.status !== "INVITADO") {
      return NextResponse.json(
        { error: "Esta cuenta ya está activa" },
        { status: 409 }
      );
    }
    if (
      employee.invitationTokenExpiresAt &&
      employee.invitationTokenExpiresAt < new Date()
    ) {
      return NextResponse.json(
        { error: "El enlace de invitación ha caducado" },
        { status: 410 }
      );
    }

    const body = await req.json();
    const parsed = activationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos no válidos", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const passwordHash = await bcrypt.hash(data.password, 12);
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;

    await db.employee.update({
      where: { id: employee.id },
      data: {
        // Datos personales
        birthDate: new Date(data.birthDate),
        address: data.address,
        phone: data.phone,

        // Emergencia
        emergencyName: data.emergencyName,
        emergencyPhone: data.emergencyPhone,
        emergencyRelation: data.emergencyRelation,

        // Bancarios
        bankAccountHolder: data.bankAccountHolder,
        iban: data.iban,

        // Chofer
        drivingLicenseNumber: data.drivingLicenseNumber ?? null,
        drivingLicenseCategory: data.drivingLicenseCategory ?? null,
        drivingLicenseExpiresAt: data.drivingLicenseExpiresAt
          ? new Date(data.drivingLicenseExpiresAt)
          : null,

        // Auth
        passwordHash,
        mustChangePassword: false,
        status: "ACTIVE",

        // Cláusula
        clausulaVersion: CLAUSULA_VERSION,
        clausulaAcceptedAt: new Date(),
        clausulaAcceptedIp: ip,

        // Invalidar token
        invitationToken: null,
        invitationTokenExpiresAt: null,
      },
    });

    await db.auditLog.create({
      data: {
        userId: employee.id,
        action: "ACTIVATE_ACCOUNT",
        entityType: "Employee",
        entityId: employee.id,
        details: { clausulaVersion: CLAUSULA_VERSION },
        ipAddress: ip ?? undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/activar/[token] error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
