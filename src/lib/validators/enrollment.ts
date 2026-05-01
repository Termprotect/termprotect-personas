import { z } from "zod";

export const ENROLLMENT_STATUSES = [
  "INSCRITO",
  "COMPLETADO",
  "NO_ASISTIO",
  "CANCELADO",
] as const;

export const ENROLLMENT_STATUS_LABELS: Record<
  (typeof ENROLLMENT_STATUSES)[number],
  string
> = {
  INSCRITO: "Inscrito",
  COMPLETADO: "Completado",
  NO_ASISTIO: "No asistió",
  CANCELADO: "Cancelado",
};

export const bulkEnrollSchema = z.object({
  employeeIds: z
    .array(z.string().min(1))
    .min(1, "Selecciona al menos un empleado")
    .max(500, "Demasiados empleados en una sola inscripción"),
});

export const enrollmentUpdateSchema = z
  .object({
    status: z.enum(ENROLLMENT_STATUSES),
    completedAt: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida")
        .optional()
    ),
    hoursCompleted: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.coerce.number().min(0).max(1000).optional()
    ),
  })
  .refine(
    (v) => v.status !== "COMPLETADO" || !!v.completedAt,
    {
      message: "Indica la fecha de finalización",
      path: ["completedAt"],
    }
  );

export type BulkEnrollInput = z.infer<typeof bulkEnrollSchema>;
export type EnrollmentUpdateInput = z.infer<typeof enrollmentUpdateSchema>;
