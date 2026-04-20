import { z } from "zod";

// IBAN español: ES + 22 dígitos
const ibanRegex = /^ES\d{22}$/i;

// Helper: permite "", null o undefined y los convierte a undefined
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    schema.optional()
  );

export const updateEmployeeSchema = z
  .object({
    // Datos personales
    nombres: z.string().min(2).max(60).trim(),
    apellidos: z.string().min(2).max(100).trim(),
    email: optional(z.string().email("Email no válido").trim().toLowerCase()),
    phone: optional(z.string().trim().max(20)),
    address: optional(z.string().trim().max(200)),
    birthDate: optional(
      z.string().refine((v) => !isNaN(Date.parse(v)), "Fecha no válida")
    ),

    // Datos laborales
    sedeId: z.string().min(1, "Selecciona una sede"),
    position: z.string().min(2, "Indica el cargo").max(80).trim(),
    department: optional(z.string().trim().max(80)),
    reportsToId: optional(z.string()),
    contractType: z.enum(["INDEFINIDO", "TEMPORAL", "FORMACION", "PRACTICAS"]),
    workMode: z.enum(["PRESENCIAL", "TELETRABAJO", "HIBRIDO"]),
    startDate: z
      .string()
      .refine((v) => !isNaN(Date.parse(v)), "Fecha de alta no válida"),
    endDate: optional(
      z.string().refine((v) => !isNaN(Date.parse(v)), "Fecha no válida")
    ),
    socialSecurityNumber: optional(z.string().trim().max(20)),
    role: z.enum(["EMPLEADO", "MANAGER", "RRHH", "ADMIN"]),
    requiresDriving: z.boolean(),

    // Bancarios
    bankAccountHolder: optional(z.string().trim().max(100)),
    iban: optional(
      z
        .string()
        .trim()
        .transform((v) => v.replace(/\s+/g, "").toUpperCase())
        .refine((v) => ibanRegex.test(v), "IBAN no válido (ES + 22 dígitos)")
    ),

    // Conducción (solo si requiresDriving)
    drivingLicenseNumber: optional(z.string().trim().max(20)),
    drivingLicenseCategory: optional(z.string().trim().max(20)),
    drivingLicenseExpiresAt: optional(
      z.string().refine((v) => !isNaN(Date.parse(v)), "Fecha no válida")
    ),
  })
  .superRefine((data, ctx) => {
    if (
      data.contractType === "TEMPORAL" &&
      data.endDate &&
      data.startDate &&
      new Date(data.endDate) < new Date(data.startDate)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "La fecha de fin no puede ser anterior a la de alta",
      });
    }
  });

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

// Campos que se rastrean en EmployeeHistory (cambios laborales relevantes)
export const TRACKED_FIELDS = [
  "sedeId",
  "position",
  "department",
  "reportsToId",
  "contractType",
  "workMode",
  "startDate",
  "endDate",
  "role",
  "requiresDriving",
  "socialSecurityNumber",
] as const;

export type TrackedField = (typeof TRACKED_FIELDS)[number];
