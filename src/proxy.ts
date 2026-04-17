import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Rutas públicas (no requieren login)
  const publicRoutes = ["/login", "/api/auth"];
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r));

  // Si no hay sesión y la ruta no es pública → redirigir a login
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Si hay sesión y debe cambiar contraseña → redirigir al cambio
  const bypassRoutes = ["/cambiar-password", "/api/change-password", "/api/auth"];
  const isBypass = bypassRoutes.some((r) => pathname.startsWith(r));
  if (session?.user.mustChangePassword && !isBypass) {
    return NextResponse.redirect(new URL("/cambiar-password", req.url));
  }

  // Si hay sesión y va al login → redirigir al dashboard
  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/inicio", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
