"use client";

import { LogOut, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const roleLabelMap: Record<string, string> = {
  ADMIN: "Administrador",
  RRHH: "RRHH",
  MANAGER: "Manager",
  EMPLEADO: "Empleado",
};

export default function Topbar({
  nombres,
  apellidos,
  role,
}: {
  nombres: string;
  apellidos: string;
  role: string;
}) {
  return (
    <header className="h-14 bg-background border-b border-border flex items-center justify-between px-6 shrink-0">
      {/* Espacio izquierdo (puede usarse para breadcrumbs en el futuro) */}
      <div />

      {/* Usuario y menú */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-foreground leading-none">
            {nombres} {apellidos}
          </p>
          <p className="text-xs text-muted-foreground leading-none mt-0.5">
            {roleLabelMap[role] ?? role}
          </p>
        </div>

        <div className="w-8 h-8 bg-info/10 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-info" />
        </div>

        <ThemeToggle />

        <button
          onClick={() => { window.location.href = "/api/auth/signout?callbackUrl=/login"; }}
          className="w-8 h-8 flex items-center justify-center rounded-lg
                     text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
