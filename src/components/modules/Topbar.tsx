"use client";

import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";

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
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      {/* Espacio izquierdo (puede usarse para breadcrumbs en el futuro) */}
      <div />

      {/* Usuario y menú */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-800 leading-none">
            {nombres} {apellidos}
          </p>
          <p className="text-xs text-slate-500 leading-none mt-0.5">
            {roleLabelMap[role] ?? role}
          </p>
        </div>

        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-blue-700" />
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-8 h-8 flex items-center justify-center rounded-lg
                     text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
