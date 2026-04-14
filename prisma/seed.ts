/**
 * Seed inicial de la base de datos
 * Crea las 4 sedes de Termprotect y el usuario administrador
 *
 * Ejecución: npx ts-node prisma/seed.ts
 * (o: npx prisma db seed)
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // ─────────────────────────────────────────────
  // 1. Crear las 4 sedes
  // ─────────────────────────────────────────────

  const sedes = await Promise.all([
    prisma.sede.upsert({
      where: { name: "Madrid" },
      update: {},
      create: {
        name: "Madrid",
        convenioCode: "28000805011982",
        convenioName: "Convenio Colectivo de Comercio Vario de la Comunidad de Madrid",
        vacationDays: 30, // revisar el convenio exacto
      },
    }),
    prisma.sede.upsert({
      where: { name: "Barcelona" },
      update: {},
      create: {
        name: "Barcelona",
        convenioCode: "08000745011994",
        convenioName: "Convenio Colectivo de Comercio de Materiales de Construcción de la Provincia de Barcelona, 2025-2026",
        vacationDays: 30,
      },
    }),
    prisma.sede.upsert({
      where: { name: "Valencia" },
      update: {},
      create: {
        name: "Valencia",
        convenioCode: "46001065011982",
        convenioName: "Convenio Colectivo de Comercio de Materiales de la Construcción de la Provincia de Valencia, 2023-2024",
        vacationDays: 30,
      },
    }),
    prisma.sede.upsert({
      where: { name: "Málaga" },
      update: {},
      create: {
        name: "Málaga",
        convenioCode: null,  // pendiente de definir
        convenioName: null,
        vacationDays: 30,   // mínimo ET hasta que se defina el convenio
      },
    }),
  ]);

  console.log(`✅ Sedes creadas: ${sedes.map((s) => s.name).join(", ")}`);

  // ─────────────────────────────────────────────
  // 2. Crear el usuario administrador
  // ─────────────────────────────────────────────
  // IMPORTANTE: Cambia los valores antes de ejecutar en producción

  const adminPassword = await bcrypt.hash("Admin2024!", 12);

  const adminSede = sedes.find((s) => s.name === "Madrid")!;

  const admin = await prisma.employee.upsert({
    where: { documentNumber: "ADMIN00000" },
    update: {},
    create: {
      nombres: "Administrador",
      apellidos: "Termprotect",
      documentType: "DNI",
      documentNumber: "ADMIN00000",  // cambia esto por el DNI real
      sedeId: adminSede.id,
      department: "Administración",
      position: "Administrador del sistema",
      contractType: "INDEFINIDO",
      startDate: new Date("2024-01-01"),
      passwordHash: adminPassword,
      role: "ADMIN",
      mustChangePassword: true,  // el admin deberá cambiar la contraseña al primer login
      status: "ACTIVE",
    },
  });

  console.log(`✅ Admin creado: documento=${admin.documentNumber}, contraseña temporal: Admin2024!`);
  console.log("⚠️  IMPORTANTE: Cambia la contraseña en el primer acceso.");

  // ─────────────────────────────────────────────
  // 3. Crear el usuario RRHH de ejemplo
  // ─────────────────────────────────────────────

  const rrhhPassword = await bcrypt.hash("Rrhh2024!", 12);

  const rrhh = await prisma.employee.upsert({
    where: { documentNumber: "RRHH000000" },
    update: {},
    create: {
      nombres: "Usuario",
      apellidos: "RRHH",
      documentType: "DNI",
      documentNumber: "RRHH000000",  // cambia esto
      sedeId: adminSede.id,
      department: "Recursos Humanos",
      position: "Técnico de RRHH",
      contractType: "INDEFINIDO",
      startDate: new Date("2024-01-01"),
      passwordHash: rrhhPassword,
      role: "RRHH",
      mustChangePassword: true,
      status: "ACTIVE",
    },
  });

  console.log(`✅ Usuario RRHH creado: documento=${rrhh.documentNumber}, contraseña temporal: Rrhh2024!`);
  console.log("🌱 Seed completado correctamente.");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
