import { z } from "zod";

// Campos opcionales: tratar "" como undefined
const optString = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().optional()
);

// Formato "HH:MM"
const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Hora no válida (HH:MM)");

// Formato "YYYY-MM-DD"
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida (YYYY-MM-DD)");

export const manualTimeEntrySchema = z
  .object({
    employeeId: z.string().min(1, "Empleado obligatorio"),
    date: isoDate,
    clockIn: hhmm,
    clockOut: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      hhmm.optional()
    ),
    breakMinutes: z.coerce
      .number()
      .int()
      .min(0, "Pausa no puede ser negativa")
      .max(600, "Pausa demasiado larga"),
    reason: z.string().min(3, "Motivo obligatorio (mín. 3 caracteres)"),
    notes: optString,
  })
  .refine(
    (d) => {
      if (!d.clockOut) return true;
      const [hi, mi] = d.clockIn.split(":").map(Number);
      const [ho, mo] = d.clockOut.split(":").map(Number);
      return ho * 60 + mo > hi * 60 + mi;
    },
    { message: "La salida debe ser posterior a la entrada", path: ["clockOut"] }
  );

export type ManualTimeEntryInput = z.infer<typeof manualTimeEntrySchema>;

// Combina una fecha (YYYY-MM-DD) con una hora (HH:MM) → Date local
export function combineDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, mn] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, h, mn, 0, 0);
}
