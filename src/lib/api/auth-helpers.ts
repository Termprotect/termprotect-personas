import { auth } from "@/lib/auth";
import { apiForbidden, apiUnauthorized } from "@/lib/api/responses";
import type { Session } from "next-auth";
import type { NextResponse } from "next/server";

export type AuthorizedSession = NonNullable<Session> & {
  user: NonNullable<Session["user"]>;
};

type Result<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

export async function requireSession(): Promise<Result<AuthorizedSession>> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, response: apiUnauthorized() };
  }
  return { ok: true, value: session as AuthorizedSession };
}

export async function requirePermission(
  check: (role: string) => boolean,
): Promise<Result<AuthorizedSession>> {
  const sessionResult = await requireSession();
  if (!sessionResult.ok) return sessionResult;

  const role = sessionResult.value.user.role ?? "";
  if (!check(role)) {
    return { ok: false, response: apiForbidden() };
  }
  return sessionResult;
}

export async function requireRole(
  allowed: ReadonlyArray<string>,
): Promise<Result<AuthorizedSession>> {
  const sessionResult = await requireSession();
  if (!sessionResult.ok) return sessionResult;

  const role = sessionResult.value.user.role ?? "";
  if (!allowed.includes(role)) {
    return { ok: false, response: apiForbidden() };
  }
  return sessionResult;
}
