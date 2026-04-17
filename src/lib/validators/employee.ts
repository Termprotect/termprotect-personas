import { z } from "zod";

// Validación básica de NIF español (DNI o NIE/TIE)
const nifRegex = /^[XYZ]?\d{7,8}[A-Z]$/i;

export const createEmployeeSchema = z.object({
  nombres: z.string().min(2, "Mínimo 2 caracteres").max(60).trim(),
  apellidos: z.string().min(2, "Mínimo 2 caracteres").max(100).trim(),
  documentType: z.enum(["DNI", "TIE", "PASAPORTE"]),
  documentNumber: z
    .string()
    .min(5, "Documento demasiado corto")
    .max(20)
    .trim()
    .toUpperCase(),
  email: z.string().email("Email no válido").trim().toLowerCase(),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  sedeId: z.string().min(1, "Selecciona una sede"),
  position: z.string().min(2, "Indica el cargo").max(80).trim(),
  department: z
    .string()
    .trim()
    .max(80)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  reportsToId: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  contractType: z.enum(["INDEFINIDO", "TEMPORAL", "FORMACION", "PRACTICAS"]),
  startDate: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), "Fecha no válida"),
  socialSecurityNumber: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  role: z.enum(["EMPLEADO", "MANAGER", "RRHH"]),
  requiresDriving: z.boolean(),
}).superRefine((data, ctx) => {
  // Validar formato DNI/TIE
  if (data.documentType !== "PASAPORTE" && !nifRegex.test(data.documentNumber)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["documentNumber"],
      message: "Formato no válido (ej: 12345678A o X1234567B)",
    });
  }
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
