import { NextResponse } from "next/server";

export function apiOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function apiError(
  message: string,
  status = 500,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status });
}

export const apiUnauthorized = (msg = "No autenticado") => apiError(msg, 401);
export const apiForbidden = (msg = "Sin permisos") => apiError(msg, 403);
export const apiNotFound = (msg = "Recurso no encontrado") => apiError(msg, 404);
export const apiBadRequest = (msg = "Solicitud no válida", extra?: Record<string, unknown>) =>
  apiError(msg, 400, extra);
export const apiConflict = (msg = "Conflicto de datos") => apiError(msg, 409);
export const apiInternalError = (msg = "Error interno") => apiError(msg, 500);
