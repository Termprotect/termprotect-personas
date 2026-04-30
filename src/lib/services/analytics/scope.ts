import type { Prisma } from "@prisma/client";

export interface ScopeInput {
  role: string;
  userId: string;
  sedeId?: string;
}

export function buildEmployeeScope({ role, userId, sedeId }: ScopeInput): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = {};
  if (role === "MANAGER") {
    where.reportsToId = userId;
  }
  if (sedeId) {
    where.sedeId = sedeId;
  }
  return where;
}

export function isFullScopeRole(role: string): boolean {
  return role === "ADMIN" || role === "RRHH";
}
