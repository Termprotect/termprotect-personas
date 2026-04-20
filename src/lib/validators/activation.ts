import { z } from "zod";

// IBAN España: 24 caracteres, empieza por ES
const ibanEsRegex = /^ES\d{22}$/;

export const activationSchema = z.object({
  // Datos personales
  birthDate: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), "Fecha no válida"),
  address: z.string().min(5, "Indica tu dirección completa").max(200).trim(),
  phone: z.string().min(6, "Teléfono no válido").max(20).trim(),

  // Contacto de emergencia
  emergencyName: z.string().min(2, "Indica el nombre").max(100).trim(),
  emergencyPhone: z.string().min(6, "Teléfono no válido").max(20).trim(),
  emergencyRelation: z.enum([
    "CONYUGE",
    "PADRE_MADRE",
    "HERMANO_A",
    "HIJO_A",
    "OTRO",
  ]),

  // Datos bancarios
  bankAccountHolder: z.string().min(2, "Indica el titular").max(100).trim(),
  iban: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => v.replace(/\s/g, ""))
    .refine((v) => ibanEsRegex.test(v), "IBAN no válido (formato ES + 22 dígitos)"),

  // Chofer (opcional, solo si requiresDriving)
  drivingLicenseNumber: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  drivingLicenseCategory: z
    .string()
    .trim()
    .max(10)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  drivingLicenseExpiresAt: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),

  // Contraseña
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
    .regex(/[0-9]/, "Debe incluir al menos un número"),
  confirmPassword: z.string(),

  // Cláusula RGPD
  acceptClausula: z.literal(true, {
    message: "Debes aceptar la cláusula para continuar",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Las contraseñas no coinciden",
});

export type ActivationInput = z.infer<typeof activationSchema>;

// Versión del texto legal para auditoría
export const CLAUSULA_VERSION = "1.0.0";
export const CLAUSULA_TEXTO =
  'Declaro que la información facilitada es veraz y me comprometo a comunicar y actualizar cualquier cambio de forma inmediata. Eximo a XTRU EUROPEA PVC, S.L. de responsabilidades derivadas de datos no actualizados por mi parte. Autorizo a Termprotect al tratamiento de mis datos personales conforme al RGPD y la LOPD-GDD para las finalidades propias de la relación laboral.';
