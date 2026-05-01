import { z } from "zod";

/**
 * Una plantilla es un conjunto de preguntas (escala 1..5 + comentarios)
 * reutilizable por distintos ciclos de evaluación por pares.
 *
 * Estructura de una pregunta:
 *   { id: "comunicacion", label: "Comunicación", help?: "…" }
 *
 * Las respuestas se guardan en Evaluation.managerScores como
 *   { comunicacion: 4, proactividad: 5, ... }
 * reutilizando las columnas existentes (no se añade tabla nueva).
 */

const questionIdRegex = /^[a-z0-9_]{2,40}$/;

export const templateQuestionSchema = z.object({
  id: z
    .string()
    .regex(
      questionIdRegex,
      "El id debe ser minúsculas, números o _ (2-40 caracteres)"
    ),
  label: z.string().min(2).max(160),
  help: z
    .string()
    .max(400)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export const templateQuestionsSchema = z
  .array(templateQuestionSchema)
  .min(1, "Añade al menos una pregunta")
  .max(20, "Máximo 20 preguntas por plantilla")
  .refine(
    (arr) => new Set(arr.map((q) => q.id)).size === arr.length,
    "Hay ids de pregunta duplicados"
  );

export const evalTemplateCreateSchema = z.object({
  name: z.string().min(3, "Nombre muy corto").max(160),
  description: z
    .string()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  questions: templateQuestionsSchema,
});

export const evalTemplateUpdateSchema = z.object({
  name: z.string().min(3).max(160).optional(),
  description: z
    .string()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  questions: templateQuestionsSchema.optional(),
  archived: z.coerce.boolean().optional(),
});

/** Respuestas dinámicas para una plantilla (mapea id→1..5) */
export function buildDynamicScoreSchema(questionIds: string[]) {
  const base = z
    .record(z.string(), z.coerce.number().int().min(1).max(5))
    .refine(
      (v) => questionIds.every((id) => typeof v[id] === "number"),
      "Faltan puntuaciones en alguna pregunta"
    )
    .refine(
      (v) => Object.keys(v).every((k) => questionIds.includes(k)),
      "Hay respuestas para preguntas que no pertenecen a la plantilla"
    );
  return base;
}

/** Media simple 1..5 sobre las respuestas (2 decimales) */
export function computeTemplateOverall(
  answers: Record<string, number>,
  questionIds: string[]
): number {
  const vals = questionIds
    .map((id) => answers[id])
    .filter((v): v is number => typeof v === "number");
  if (vals.length === 0) return 0;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg * 100) / 100;
}

export type TemplateQuestion = z.infer<typeof templateQuestionSchema>;
export type EvalTemplateCreateInput = z.infer<typeof evalTemplateCreateSchema>;
export type EvalTemplateUpdateInput = z.infer<typeof evalTemplateUpdateSchema>;

/** ── Peer setup ─────────────────────────────── */

const cuid = z.string().min(1);

export const peerAssignmentSchema = z.object({
  /** Empleado evaluado */
  subjectId: cuid,
  /** Plantilla a usar para ese sujeto */
  templateId: cuid,
  /** Evaluadores que calificarán a ese sujeto */
  evaluatorIds: z.array(cuid).min(1, "Asigna al menos un evaluador"),
});

export const peerSetupSchema = z.object({
  assignments: z
    .array(peerAssignmentSchema)
    .min(1, "Añade al menos un evaluado"),
  /** Si true y el ciclo está en BORRADOR, se activa tras crear */
  activate: z.coerce.boolean().optional().default(false),
});

export type PeerSetupInput = z.infer<typeof peerSetupSchema>;
export type PeerAssignmentInput = z.infer<typeof peerAssignmentSchema>;
