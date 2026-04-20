import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  uploadDocument,
  isValidDocMime,
  MAX_DOC_SIZE_MB,
} from "@/lib/storage";

const VALID_KINDS = [
  "DNI_ANVERSO",
  "DNI_REVERSO",
  "TIE_ANVERSO",
  "TIE_REVERSO",
  "PASAPORTE",
  "CERTIFICADO_BANCARIO",
  "PERMISO_CONDUCIR",
  "CONTRATO",
  "RGPD",
  "PRL",
  "OTRO",
] as const;

type DocKind = (typeof VALID_KINDS)[number];

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
    const kind = formData.get("kind") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }
    if (!kind || !VALID_KINDS.includes(kind as DocKind)) {
      return NextResponse.json({ error: "Tipo de documento no válido" }, { status: 400 });
    }
    if (!isValidDocMime(file.type)) {
      return NextResponse.json(
        { error: "Formato no válido (usa JPG, PNG, WEBP o PDF)" },
        { status: 400 }
      );
    }
    if (file.size > MAX_DOC_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `El archivo supera los ${MAX_DOC_SIZE_MB} MB` },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const { path } = await uploadDocument({
      employeeId: employee.id,
      kind,
      buffer,
      contentType: file.type,
      originalName: file.name,
    });

    const doc = await db.employeeDocument.create({
      data: {
        employeeId: employee.id,
        type: kind as DocKind,
        fileUrl: path, // guardamos el path (bucket privado)
        fileName: file.name,
        uploadedBy: employee.id,
      },
      select: { id: true, fileName: true, type: true },
    });

    return NextResponse.json(doc);
  } catch (err) {
    console.error("POST /api/upload/document error:", err);
    return NextResponse.json(
      { error: "No se pudo subir el documento" },
      { status: 500 }
    );
  }
}
