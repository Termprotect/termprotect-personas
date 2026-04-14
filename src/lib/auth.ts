import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  documentNumber: z.string().min(8).max(20).trim().toUpperCase(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.sedeId = user.sedeId;
        token.nombres = user.nombres;
        token.apellidos = user.apellidos;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.sedeId = token.sedeId as string;
        session.user.nombres = token.nombres as string;
        session.user.apellidos = token.apellidos as string;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        documentNumber: { label: "Nº Documento", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { documentNumber, password } = parsed.data;

        const employee = await db.employee.findUnique({
          where: { documentNumber },
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            email: true,
            passwordHash: true,
            role: true,
            sedeId: true,
            mustChangePassword: true,
            status: true,
          },
        });

        if (!employee) return null;
        if (employee.status === "BAJA_VOLUNTARIA" || employee.status === "DESPIDO") {
          return null; // empleados dados de baja no pueden acceder
        }

        const passwordMatch = await bcrypt.compare(password, employee.passwordHash);
        if (!passwordMatch) return null;

        // Actualizar último acceso
        await db.employee.update({
          where: { id: employee.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: employee.id,
          name: `${employee.nombres} ${employee.apellidos}`,
          email: employee.email ?? undefined,
          role: employee.role,
          sedeId: employee.sedeId,
          nombres: employee.nombres,
          apellidos: employee.apellidos,
          mustChangePassword: employee.mustChangePassword,
        };
      },
    }),
  ],
});

// Tipos extendidos para TypeScript
declare module "next-auth" {
  interface User {
    role: string;
    sedeId: string;
    nombres: string;
    apellidos: string;
    mustChangePassword: boolean;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: string;
      sedeId: string;
      nombres: string;
      apellidos: string;
      mustChangePassword: boolean;
    };
  }
}
