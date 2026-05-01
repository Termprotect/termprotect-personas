import { z } from "zod";

/** Competencias evaluadas — comunes a evaluación manager y autoevaluación */
export const EVAL_DIMENSIONS = [
  "calidad_trabajo",
  "conocimientos_tecnicos",
  "orientacion_resultados",
  "trabajo_equipo",
  "comunicacion",
  "iniciativa_autonomia",
  "adaptabilidad",
  "compromiso",
] as const;

export type EvalDimension = (typeof EVAL_DIMENSIONS)[number];

export const EVAL_DIMENSION_LABELS: Record<EvalDimension, string> = {
  calidad_trabajo: "Calidad del trabajo",
  conocimientos_tecnicos: "Conocimientos técnicos",
  orientacion_resultados: "Orientación a resultados",
  trabajo_equipo: "Trabajo en equipo",
  comunicacion: "Comunicación",
  iniciativa_autonomia: "Iniciativa y autonomía",
  adaptabilidad: "Adaptabilidad",
  compromiso: "Compromiso",
};

export const SCORE_LABELS: Record<number, string> = {
  1: "Muy por debajo",
  2: "Por debajo",
  3: "Cumple",
  4: "Por encima",
  5: "Excelente",
};

/** Tipo de ciclo */
export const EVAL_CYCLE_KINDS = ["ANNUAL", "MONTHLY_PEER"] as const;
export const EVAL_CYCLE_KIND_LABELS: Record<
  (typeof EVAL_CYCLE_KINDS)[number],
  string
> = {
  ANNUAL: "Anual (competencias)",
  MONTHLY_PEER: "Mensual por pares",
};

/** Tipo de evaluador */
export const EVALUATOR_TYPES = ["MANAGER", "PEER", "SELF"] as const;
export const EVALUATOR_TYPE_LABELS: Record<
  (typeof EVALUATOR_TYPES)[number],
  string
> = {
  MANAGER: "Manager",
  PEER: "Compañero",
  SELF: "Autoevaluación",
};

/** Estado del ciclo */
export const EVAL_CYCLE_STATUSES = ["BORRADOR", "ACTIVO", "CERRADO"] as const;
export const EVAL_CYCLE_STATUS_LABELS: Record<
  (typeof EVAL_CYCLE_STATUSES)[number],
  string
> = {
  BORRADOR: "Borrador",
  ACTIVO: "Activo",
  CERRADO: "Cerrado",
};

/** Estado de una evaluación individual */
export const EVAL_STATUSES = [
  "PENDIENTE",
  "AUTOEVALUACION_COMPLETADA",
  "MANAGER_COMPLETADA",
  "CERRADA",
] as const;
export const EVAL_STATUS_LABELS: Record<
  (typeof EVAL_STATUSES)[number],
  string
> = {
  PENDIENTE: "Pendiente",
  AUTOEVALUACION_COMPLETADA: "Autoevaluación completada",
  MANAGER_COMPLETADA: "Revisión manager",
  CERRADA: "Cerrada",
};

/** Mapa competencia→score (1..5) */
export const scoreMapSchema = z
  .record(z.enum(EVAL_DIMENSIONS), z.coerce.number().int().min(1).max(5))
  .refine(
    (v) => EVAL_DIMENSIONS.every((d) => typeof v[d] === "number"),
    "Faltan puntuaciones en alguna competencia"
  );

export type ScoreMap = Partial<Record<EvalDimension, number>>;

/** ── EvalCycle ─────────────────────────────── */
const iso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const evalCycleCreateSchema = z
  .object({
    name: z.string().min(3, "Nombre muy corto").max(160),
    kind: z.enum(EVAL_CYCLE_KINDS).optional().default("ANNUAL"),
    startDate: iso,
    endDate: iso,
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "La fecha de fin debe ser igual o posterior al inicio",
    path: ["endDate"],
  });

export const evalCycleUpdateSchema = z.object({
  name: z.string().min(3).max(160).optional(),
  startDate: iso.optional(),
  endDate: iso.optional(),
  status: z.enum(EVAL_CYCLE_STATUSES).optional(),
});

/** ── Self review ────────────────────────────── */
export const selfReviewSchema = z.object({
  selfScores: scoreMapSchema,
  selfComments: z.string().max(3000).optional().or(z.literal("")).transform(
    (v) => (v && v.length > 0 ? v : undefined)
  ),
});

/** ── Manager review ─────────────────────────── */
export const managerReviewSchema = z.object({
  managerScores: scoreMapSchema,
  managerComments: z.string().max(3000).optional().or(z.literal("")).transform(
    (v) => (v && v.length > 0 ? v : undefined)
  ),
  pipRequired: z.coerce.boolean().optional().default(false),
});

/** ── Cierre ────────────────────────────────── */
export const closeEvaluationSchema = z.object({
  pipRequired: z.coerce.boolean().optional(),
});

/** ── PIP ───────────────────────────────────── */
export const PIP_STATUSES = ["ACTIVO", "COMPLETADO", "ARCHIVADO"] as const;
export const PIP_STATUS_LABELS: Record<
  (typeof PIP_STATUSES)[number],
  string
> = {
  ACTIVO: "Activo",
  COMPLETADO: "Completado",
  ARCHIVADO: "Archivado",
};

export const pipSchema = z.object({
  objectives: z.string().min(10, "Describe los objetivos del PIP").max(5000),
  deadline: iso,
  status: z.enum(PIP_STATUSES).optional().default("ACTIVO"),
  notes: z.string().max(3000).optional().or(z.literal("")).transform(
    (v) => (v && v.length > 0 ? v : undefined)
  ),
});

/** Cálculo de overall desde un mapa completo de scores (promedio redondeado 2 decimales) */
export function computeOverall(scores: ScoreMap): number {
  const vals = EVAL_DIMENSIONS.map((d) => scores[d]).filter(
    (v): v is number => typeof v === "number"
  );
  if (vals.length === 0) return 0;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg * 100) / 100;
}

export type EvalCycleCreateInput = z.infer<typeof evalCycleCreateSchema>;
export type EvalCycleUpdateInput = z.infer<typeof evalCycleUpdateSchema>;
export type SelfReviewInput = z.infer<typeof selfReviewSchema>;
export type ManagerReviewInput = z.infer<typeof managerReviewSchema>;
export type PipInput = z.infer<typeof pipSchema>;
