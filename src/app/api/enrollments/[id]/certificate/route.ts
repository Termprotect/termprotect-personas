import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  uploadDocument,
  getSignedDocUrl,
  isValidDocMime,
  MAX_DOC_SIZE_MB,
} from "@/lib/storage";

export const runtime = "nodejs";

// GET — devuelve URL firmada al certificado
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const { id } = await params;

    const e = await db.trainingEnrollment.findUnique({
      where: { id },
      select: { id: true, employeeId: true, certificateUrl: true },
    });
    if (!e) {
      return NextResponse.json(
        { error: "Inscripción no encontrada" },
        { status: 404 }
      );
    }
    if (!e.certificateUrl) {
      return NextResponse.json({ error: "Sin certificado" }, { status: 404 });
    }

    const role = session.user.role;
    const userId = session.user.id;
    const isStaff = role === "ADMIN" || role === "RRHH";
    const isOwner = e.employeeId === userId;
    if (!isStaff && !isOwner) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const url = await getSignedDocUrl(e.certificateUrl, 60 * 10);

    await db.auditLog.create({
      data: {
        userId,
        action: "VIEW_TRAINING_CERTIFICATE",
        entityType: "TrainingEnrollment",
        entityId: id,
        details: {},
      },
    });

    return NextResponse.json({ url });
  } catch (err) {
    console.error("GET /api/enrollments/[id]/certificate error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — subir certificado (multipart con 'file')
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const { id } = await params;

    const e = await db.trainingEnrollment.findUnique({
      where: { id },
      select: { id: true, employeeId: true, status: true },
    });
    if (!e) {
      return NextResponse.json(
        { error: "Inscripción no encontrada" },
        { status: 404 }
      );
    }

    const role = session.user.role;
    const userId = session.user.id;
    const isStaff = role === "ADMIN" || role === "RRHH";
    const isOwner = e.employeeId === userId;
    if (!isStaff && !isOwner) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Debe enviarse como multipart/form-data" },
        { status: 400 }
      );
    }
    const form = await req.formData();
    const f = form.get("file");
    if (!f || !(f instanceof File) || f.size === 0) {
      return NextResponse.json(
        { error: "Archivo no recibido" },
        { status: 400 }
      );
    }
    if (!isValidDocMime(f.type)) {
      return NextResponse.json(
        { error: "Formato no válido (JPG, PNG, WEBP o PDF)" },
        { status: 400 }
      );
    }
    if (f.size > MAX_DOC_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `El archivo supera los ${MAX_DOC_SIZE_MB} MB` },
        { status: 400 }
      );
    }

    const buffer = await f.arrayBuffer();
    const { path } = await uploadDocument({
      employeeId: e.employeeId,
      kind: "cert-training",
      buffer,
      contentType: f.type,
      originalName: f.name,
    });

    await db.trainingEnrollment.update({
      where: { id },
      data: { certificateUrl: path },
    });

    await db.auditLog.create({
      data: {
        userId,
        action: "UPLOAD_TRAINING_CERTIFICATE",
        entityType: "TrainingEnrollment",
        entityId: id,
        details: { originalName: f.name, size: f.size },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/enrollments/[id]/certificate error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE — eliminar referencia al certificado (no borra el fichero)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!["ADMIN", "RRHH"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
    const { id } = await params;

    const e = await db.trainingEnrollment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!e) {
      return NextResponse.json(
        { error: "Inscripción no encontrada" },
        { status: 404 }
      );
    }

    await db.trainingEnrollment.update({
      where: { id },
      data: { certificateUrl: null },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "REMOVE_TRAINING_CERTIFICATE",
        entityType: "TrainingEnrollment",
        entityId: id,
        details: {},
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/enrollments/[id]/certificate error:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
