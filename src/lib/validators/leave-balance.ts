import { z } from "zod";

const optString = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().optional()
);

export const leaveBalanceUpdateSchema = z.object({
  employeeId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  totalDays: z.coerce.number().int().min(0).max(60),
  personalTotal: z.coerce.number().int().min(0).max(20),
  notes: optString,
});

export type LeaveBalanceUpdateInput = z.infer<typeof leaveBalanceUpdateSchema>;

export const leaveBalanceBootstrapSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  sedeId: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().optional()
  ),
});

export type LeaveBalanceBootstrapInput = z.infer<
  typeof leaveBalanceBootstrapSchema
>;
