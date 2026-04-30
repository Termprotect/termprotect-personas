"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  Clock,
  CalendarDays,
  Star,
  BookOpen,
  BarChart3,
  Settings,
  Home,
  Shield,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  minRole: string; // rol mínimo para ver este item
}

const navItems: NavItem[] = [
  { label: "Inicio",        href: "/inicio",        icon: Home,        minRole: "EMPLEADO" },
  { label: "Empleados",     href: "/empleados",     icon: Users,       minRole: "RRHH"     },
  { label: "Jornada",       href: "/jornada",       icon: Clock,       minRole: "EMPLEADO" },
  { label: "Ausencias",     href: "/ausencias",     icon: CalendarDays,minRole: "EMPLEADO" },
  { label: "Evaluaciones",  href: "/evaluaciones",  icon: Star,        minRole: "EMPLEADO" },
  { label: "Formación",     href: "/formacion",     icon: BookOpen,    minRole: "EMPLEADO" },
  { label: "Analytics",     href: "/analytics",     icon: BarChart3,   minRole: "MANAGER"  },
  { label: "Configuración", href: "/configuracion", icon: Settings,    minRole: "ADMIN"    },
];

const roleHierarchy: Record<string, number> = {
  ADMIN: 4, RRHH: 3, MANAGER: 2, EMPLEADO: 1,
};

function canSee(userRole: string, minRole: string): boolean {
  return (roleHierarchy[userRole] ?? 0) >= (roleHierarchy[minRole] ?? 99);
}

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();

  // Sidebar always dark — uses stone palette (warm grays) + hardcoded gold accent
  // so it stays consistent in both light and dark modes (decision: "Mantener oscuro")
  return (
    <aside className="w-56 bg-stone-900 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-stone-800">
        <div className="w-8 h-8 bg-[#A16207] rounded-lg flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-stone-50 text-sm font-semibold leading-none">Termprotect</p>
          <p className="text-stone-400 text-xs leading-none mt-0.5">Personas</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems
          .filter((item) => canSee(role, item.minRole))
          .map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#A16207] text-white shadow-sm"
                    : "text-stone-300 hover:text-stone-50 hover:bg-stone-800"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
      </nav>

      {/* Versión */}
      <div className="px-5 py-3 border-t border-stone-800">
        <p className="text-stone-500 text-xs">v1.0.0</p>
      </div>
    </aside>
  );
}
