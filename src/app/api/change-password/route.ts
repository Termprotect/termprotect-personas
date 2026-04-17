import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});

// Patrón correcto NextAuth v5: envolver el handler con auth()
export const POST = auth(async function POST(req: NextRequest & { auth: { user: { id: string } } | null }) {
  try {
    // req.auth contiene la sesión en NextAuth v5
    const userId = req.auth?.user?.id;

    if (!userId) {
      console.error("change-password: no userId in session", req.auth);
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(parsed.data.newPassword, 12);

    await db.employee.update({
      where: { id: userId },
      data: {
        passwordHash: hash,
        mustChangePassword: false,
      },
    });

    console.log("change-password: actualizado userId", userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("change-password error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}) as (req: NextRequest) => Promise<NextResponse>;
