import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { copyYearSchema } from "@/lib/validators/sede-config";

// POST: copia todos los festivos de un año a otro. Ignora los que ya existen.
export async function POST(
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
    const parsed = copyYearSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos no válidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { fromYear, toYear } = parsed.data;

    if (fromYear === toYear) {
      return NextResponse.json(
        { error: "Los años de origen y destino no pueden ser iguales" },
        { status: 400 }
      );
    }

    const fromStart = new Date(Date.UTC(fromYear, 0, 1));
    const fromEnd = new Date(Date.UTC(fromYear + 1, 0, 1));

    const source = await db.sedeCalendar.findMany({
      where: { sedeId, date: { gte: fromStart, lt: fromEnd } },
    });

    if (source.length === 0) {
      return NextResponse.json(
        { error: `No hay festivos registrados en ${fromYear}` },
        { status: 404 }
      );
    }

    const yearDiff = toYear - fromYear;

    let created = 0;
    let skipped = 0;

    for (const h of source) {
      const d = h.date;
      // Convertir a mismo mes/día del nuevo año, en UTC
      const newDate = new Date(
        Date.UTC(d.getUTCFullYear() + yearDiff, d.getUTCMonth(), d.getUTCDate())
      );
      try {
        await db.sedeCalendar.create({
          data: {
            sedeId,
            date: newDate,
            description: h.description,
            type: h.type,
          },
        });
        created += 1;
      } catch (e) {
        if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
          skipped += 1;
        } else {
          throw e;
        }
      }
    }

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "COPY_HOLIDAYS_YEAR",
        entityType: "Sede",
        entityId: sedeId,
        details: { fromYear, toYear, created, skipped },
      },
    });

    return NextResponse.json({ created, skipped });
  } catch (err) {
    console.error("POST copy-year:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
