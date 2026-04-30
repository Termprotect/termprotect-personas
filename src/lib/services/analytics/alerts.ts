import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { addDays, addMonths } from "./date-range";

export interface AlertItem {
  id: string;
  category: string;
  label: string;
  count: number;
  severity: "critical" | "warning" | "info";
  href?: string;
}

export interface AlertsResult {
  items: AlertItem[];
  totalsByLevel: { critical: number; warning: number; info: number };
}

export async function getAlerts(
  scope: Prisma.EmployeeWhereInput,
  now: Date = new Date(),
): Promise<AlertsResult> {
  const in30 = addDays(now, 30);
  const in60 = addDays(now, 60);
  const in90 = addDays(now, 90);
  const trialIn30 = addMonths(now, 1);
  const recentManualFrom = addDays(now, -30);

  const [
    docsExpired,
    docsIn30,
    docsIn60,
    docsIn90,
    contractsIn60,
    trialEnding,
    unsignedRgpd,
    unmanaged,
    manualEntries,
  ] = await Promise.all([
    db.employeeDocument.count({
      where: { employee: scope, expiresAt: { lt: now, not: null } },
    }),
    db.employeeDocument.count({
      where: { employee: scope, expiresAt: { gte: now, lte: in30 } },
    }),
    db.employeeDocument.count({
      where: { employee: scope, expiresAt: { gt: in30, lte: in60 } },
    }),
    db.employeeDocument.count({
      where: { employee: scope, expiresAt: { gt: in60, lte: in90 } },
    }),
    db.employee.count({
      where: {
        ...scope,
        contractType: "TEMPORAL",
        endDate: { gte: now, lte: addDays(now, 60) },
      },
    }),
    db.employee.count({
      where: {
        ...scope,
        trialEndDate: { gte: now, lte: trialIn30 },
      },
    }),
    db.employee.count({
      where: {
        ...scope,
        status: { in: ["ACTIVE", "INVITADO"] },
        clausulaAcceptedAt: null,
      },
    }),
    db.employee.count({
      where: {
        ...scope,
        status: "ACTIVE",
        reportsToId: null,
        role: { not: "ADMIN" },
      },
    }),
    db.timeEntry.count({
      where: {
        employee: scope,
        isManual: true,
        date: { gte: recentManualFrom },
      },
    }),
  ]);

  const items: AlertItem[] = [
    { id: "docs-expired", category: "Documentos", label: "Documentos vencidos", count: docsExpired, severity: "critical" },
    { id: "docs-30", category: "Documentos", label: "Vencen en 30 días", count: docsIn30, severity: "warning" },
    { id: "docs-60", category: "Documentos", label: "Vencen en 60 días", count: docsIn60, severity: "info" },
    { id: "docs-90", category: "Documentos", label: "Vencen en 90 días", count: docsIn90, severity: "info" },
    { id: "contracts-60", category: "Contratación", label: "Contratos temporales por renovar (60 días)", count: contractsIn60, severity: "warning" },
    { id: "trial-30", category: "Contratación", label: "Fin de periodo de prueba (30 días)", count: trialEnding, severity: "info" },
    { id: "rgpd", category: "Cumplimiento", label: "Empleados sin firmar RGPD", count: unsignedRgpd, severity: "warning" },
    { id: "no-manager", category: "Organización", label: "Empleados sin manager asignado", count: unmanaged, severity: "info" },
    { id: "manual-entries", category: "Jornada", label: "Fichajes manuales recientes (30 días)", count: manualEntries, severity: "info" },
  ];

  const totalsByLevel = items.reduce(
    (acc, it) => {
      acc[it.severity] += it.count;
      return acc;
    },
    { critical: 0, warning: 0, info: 0 },
  );

  return { items, totalsByLevel };
}
