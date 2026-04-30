import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface AuditLogInput {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Prisma.InputJsonValue;
  request?: Request | null;
}

function extractIp(request: Request | null | undefined): string | null {
  if (!request) return null;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  return realIp?.trim() || null;
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  const { userId, action, entityType, entityId, details, request } = input;
  await db.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId: entityId ?? null,
      ...(details !== undefined ? { details } : {}),
      ipAddress: extractIp(request) ?? undefined,
    },
  });
}
