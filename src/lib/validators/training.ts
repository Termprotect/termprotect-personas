import { z } from "zod";

const optString = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().optional()
);

const optDate = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida")
    .optional()
);

export const TRAINING_MODES = ["PRESENCIAL", "ONLINE", "MIXTA"] as const;
export const TRAINING_MODE_LABELS: Record<
  (typeof TRAINING_MODES)[number],
  string
> = {
  PRESENCIAL: "Presencial",
  ONLINE: "Online",
  MIXTA: "Mixta",
};

// Tipos comunes de formación obligatoria en España
export const MANDATORY_TYPES = [
  "PRL",
  "RGPD",
  "IGUALDAD",
  "ACOSO",
  "PROTOCOLO_LGTBI",
  "RIESGOS_ESPECIFICOS",
  "OTRO",
] as const;

export const MANDATORY_TYPE_LABELS: Record<
  (typeof MANDATORY_TYPES)[number],
  string
> = {
  PRL: "Prevención de Riesgos Laborales",
  RGPD: "Protección de datos (RGPD)",
  IGUALDAD: "Plan de Igualdad",
  ACOSO: "Prevención del acoso",
  PROTOCOLO_LGTBI: "Protocolo LGTBI",
  RIESGOS_ESPECIFICOS: "Riesgos específicos del puesto",
  OTRO: "Otro",
};

export const trainingSchema = z
  .object({
    title: z.string().min(3, "Título obligatorio (mín. 3 caracteres)").max(160),
    provider: optString,
    mode: z.enum(TRAINING_MODES),
    hours: z.coerce
      .number()
      .min(0.5, "Mínimo 0.5 h")
      .max(1000, "Valor demasiado alto"),
    cost: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.coerce.number().min(0).max(100000).optional()
    ),
    mandatory: z.coerce.boolean().optional().default(false),
    mandatoryType: optString,
    fundaeEligible: z.coerce.boolean().optional().default(false),
    description: optString,
    startDate: optDate,
    endDate: optDate,
  })
  .refine(
    (v) => !v.mandatory || (v.mandatoryType && v.mandatoryType.length > 0),
    {
      message: "Si la formación es obligatoria, indica el tipo",
      path: ["mandatoryType"],
    }
  )
  .refine(
    (v) => !v.startDate || !v.endDate || v.endDate >= v.startDate,
    {
      message: "La fecha fin no puede ser anterior a la fecha inicio",
      path: ["endDate"],
    }
  );

export type TrainingInput = z.infer<typeof trainingSchema>;

export function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}
