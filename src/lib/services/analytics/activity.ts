import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: Date;
  userName: string;
  userId: string;
  sedeId: string | null;
  sedeName: string | null;
}

export interface ActivityResult {
  items: ActivityItem[];
}

const DEFAULT_LIMIT = 20;

export async function getRecentActivity(
  scope: Prisma.EmployeeWhereInput,
  limit: number = DEFAULT_LIMIT,
): Promise<ActivityResult> {
  const rows = await db.auditLog.findMany({
    take: Math.min(100, Math.max(1, limit)),
    orderBy: { createdAt: "desc" },
    where: { user: scope },
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      userId: true,
      user: {
        select: {
          nombres: true,
          apellidos: true,
          sedeId: true,
          sede: { select: { name: true } },
        },
      },
    },
  });

  return {
    items: rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      createdAt: r.createdAt,
      userId: r.userId,
      userName: `${r.user.nombres} ${r.user.apellidos}`.trim(),
      sedeId: r.user.sedeId ?? null,
      sedeName: r.user.sede?.name ?? null,
    })),
  };
}
