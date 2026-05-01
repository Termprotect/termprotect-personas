import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseDateOnly, sedeCalendarSchema } from "@/lib/validators/sede-config";

function getIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}

async function guard() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "RRHH") {
    return { session: null, error: NextResponse.json({ error: "Sin permiso" }, { status: 403 }) };
  }
  return { session, error: null };
}

// POST: crear festivo
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const g = await guard();
    if (g.error) return g.error;
    const session = g.session!;

    const { id: sedeId } = await ctx.params;
    const parsed = sedeCalendarSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos no válidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { date, description, type } = parsed.data;
    const dateDt = parseDateOnly(date);

    try {
      const cal = await db.sedeCalendar.create({
        data: { sedeId, date: dateDt, description, type },
      });
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE_HOLIDAY",
          entityType: "SedeCalendar",
          entityId: cal.id,
          details: { sedeId, date, description, type },
          ipAddress: getIp(req),
        },
      });
      return NextResponse.json({ calendar: cal });
    } catch (e) {
      // Unique violation → ya existe ese día
      if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe un festivo en esa fecha" },
          { status: 409 }
        );
      }
      throw e;
    }
  } catch (err) {
    console.error("POST /api/sedes/[id]/calendar:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
