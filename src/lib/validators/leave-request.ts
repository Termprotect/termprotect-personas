import { z } from "zod";

const optString = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().optional()
);

export const LEAVE_TYPES = [
  "VACACIONES",
  "PERMISO_MATRIMONIO",
  "PERMISO_NACIMIENTO",
  "PERMISO_FALLECIMIENTO_1",
  "PERMISO_FALLECIMIENTO_2",
  "PERMISO_HOSPITALIZACION",
  "PERMISO_MUDANZA",
  "PERMISO_DEBER_PUBLICO",
  "PERMISO_EXAMEN",
  "PERMISO_LACTANCIA",
  "PERMISO_ASUNTOS_PROPIOS",
  "INCAPACIDAD_TEMPORAL",
  "EXCEDENCIA_VOLUNTARIA",
  "EXCEDENCIA_HIJOS",
  "EXCEDENCIA_FAMILIARES",
  "OTRO",
] as const;

export const LEAVE_TYPE_LABELS: Record<(typeof LEAVE_TYPES)[number], string> = {
  VACACIONES: "Vacaciones",
  PERMISO_MATRIMONIO: "Permiso por matrimonio",
  PERMISO_NACIMIENTO: "Permiso por nacimiento",
  PERMISO_FALLECIMIENTO_1: "Fallecimiento familiar 1er grado",
  PERMISO_FALLECIMIENTO_2: "Fallecimiento familiar 2do grado",
  PERMISO_HOSPITALIZACION: "Hospitalización familiar",
  PERMISO_MUDANZA: "Traslado de domicilio",
  PERMISO_DEBER_PUBLICO: "Deber público / jurado",
  PERMISO_EXAMEN: "Examen oficial",
  PERMISO_LACTANCIA: "Lactancia",
  PERMISO_ASUNTOS_PROPIOS: "Asuntos propios",
  INCAPACIDAD_TEMPORAL: "Incapacidad temporal (IT)",
  EXCEDENCIA_VOLUNTARIA: "Excedencia voluntaria",
  EXCEDENCIA_HIJOS: "Excedencia cuidado hijos",
  EXCEDENCIA_FAMILIARES: "Excedencia cuidado familiares",
  OTRO: "Otro",
};

/**
 * Tipos que consumen saldo de vacaciones.
 */
export const CONSUMES_VACATION: ReadonlyArray<(typeof LEAVE_TYPES)[number]> = [
  "VACACIONES",
];

/**
 * Tipos que consumen saldo de asuntos propios.
 */
export const CONSUMES_PERSONAL: ReadonlyArray<(typeof LEAVE_TYPES)[number]> = [
  "PERMISO_ASUNTOS_PROPIOS",
];

/**
 * Tipos donde el justificante es obligatorio.
 */
export const REQUIRES_ATTACHMENT: ReadonlyArray<(typeof LEAVE_TYPES)[number]> = [
  "INCAPACIDAD_TEMPORAL",
  "PERMISO_MATRIMONIO",
  "PERMISO_NACIMIENTO",
  "PERMISO_FALLECIMIENTO_1",
  "PERMISO_FALLECIMIENTO_2",
  "PERMISO_HOSPITALIZACION",
  "PERMISO_DEBER_PUBLICO",
  "PERMISO_EXAMEN",
  "EXCEDENCIA_VOLUNTARIA",
  "EXCEDENCIA_HIJOS",
  "EXCEDENCIA_FAMILIARES",
];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida");

export const leaveRequestSchema = z
  .object({
    type: z.enum(LEAVE_TYPES),
    startDate: isoDate,
    endDate: isoDate,
    notes: optString,
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "La fecha fin no puede ser anterior a la fecha inicio",
    path: ["endDate"],
  });

export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;

export function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}
