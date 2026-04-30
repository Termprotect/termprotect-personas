import { NextRequest, NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { apiBadRequest } from "@/lib/api/responses";

type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export function parseSearchParams<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): ParseResult<T> {
  const raw: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: apiBadRequest("Parámetros no válidos", {
        issues: parsed.error.flatten().fieldErrors,
      }),
    };
  }
  return { ok: true, data: parsed.data };
}

export async function parseJsonBody<T>(
  req: Request,
  schema: ZodSchema<T>,
): Promise<ParseResult<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, response: apiBadRequest("JSON no válido") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: apiBadRequest("Datos no válidos", {
        issues: parsed.error.flatten().fieldErrors,
      }),
    };
  }
  return { ok: true, data: parsed.data };
}
