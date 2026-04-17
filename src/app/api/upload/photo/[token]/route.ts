import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  uploadPhoto,
  isValidImageMime,
  MAX_PHOTO_SIZE_MB,
} from "@/lib/storage";

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
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Token no válido" }, { status: 404 });
    }
    if (employee.status !== "INVITADO") {
      return NextResponse.json({ error: "Cuenta ya activa" }, { status: 409 });
    }
    if (
      employee.invitationTokenExpiresAt &&
      employee.invitationTokenExpiresAt < new Date()
    ) {
      return NextResponse.json({ error: "Token caducado" }, { status: 410 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }
    if (!isValidImageMime(file.type)) {
      return NextResponse.json(
        { error: "Formato no válido (usa JPG, PNG o WEBP)" },
        { status: 400 }
      );
    }
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `La imagen supera los ${MAX_PHOTO_SIZE_MB} MB` },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const { publicUrl } = await uploadPhoto({
      employeeId: employee.id,
      buffer,
      contentType: file.type,
    });

    await db.employee.update({
      where: { id: employee.id },
      data: {
        photoUrl: publicUrl,
        photoUploadedAt: new Date(),
      },
    });

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("POST /api/upload/photo error:", err);
    return NextResponse.json(
      { error: "No se pudo subir la imagen" },
      { status: 500 }
    );
  }
}
