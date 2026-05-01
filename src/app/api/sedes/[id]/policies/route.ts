import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sedePolicySchema } from "@/lib/validators/sede-config";

// PUT: upsert de política anual (crea o actualiza la política del año indicado)
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (session.user.role !== "ADMIN" && session.user.role !== "RRHH")
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

    const { id: sedeId } = await ctx.params;
    const parsed = sedePolicySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos no válidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { year, vacationDays, extraPersonalDays, notes } = parsed.data;

    const sede = await db.sede.findUnique({ where: { id: sedeId } });
    if (!sede) {
      return NextResponse.json({ error: "Sede no encontrada" }, { status: 404 });
    }

    const policy = await db.sedePolicy.upsert({
      where: { sedeId_year: { sedeId, year } },
      create: {
        sedeId,
        year,
        vacationDays,
        extraPersonalDays,
        notes: notes ?? null,
      },
      update: {
        vacationDays,
        extraPersonalDays,
        notes: notes ?? null,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPSERT_SEDE_POLICY",
        entityType: "SedePolicy",
        entityId: policy.id,
        details: { sedeId, year, vacationDays, extraPersonalDays },
      },
    });

    return NextResponse.json({ policy });
  } catch (err) {
    console.error("PUT /api/sedes/[id]/policies:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
