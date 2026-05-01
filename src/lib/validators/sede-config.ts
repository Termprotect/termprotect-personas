import { z } from "zod";

const optString = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().optional()
);

// ─── Festivo ────────────────────────────────────
export const sedeCalendarSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida"),
  description: z.string().min(2, "Descripción obligatoria").max(120),
  type: z.enum(["NACIONAL", "AUTONOMICO", "LOCAL", "CONVENIO"]),
});

export type SedeCalendarInput = z.infer<typeof sedeCalendarSchema>;

// Copiar festivos de año anterior
export const copyYearSchema = z.object({
  fromYear: z.coerce.number().int().min(2000).max(2100),
  toYear: z.coerce.number().int().min(2000).max(2100),
});

// ─── Política anual ─────────────────────────────
export const sedePolicySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  vacationDays: z.coerce
    .number()
    .int()
    .min(0, "Días no puede ser negativo")
    .max(60, "Valor demasiado alto"),
  extraPersonalDays: z.coerce
    .number()
    .int()
    .min(0, "Días no puede ser negativo")
    .max(20, "Valor demasiado alto"),
  notes: optString,
});

export type SedePolicyInput = z.infer<typeof sedePolicySchema>;

// Helper: construir Date desde "YYYY-MM-DD" (día UTC, para @db.Date)
export function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}
