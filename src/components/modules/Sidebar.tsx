"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  BarChart2,
  Users,
  Star,
  BookOpen,
  Clock,
  CalendarDays,
  Settings,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  minRole: string;
  badge?: string | number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    label: "Principal",
    items: [
      { label: "Inicio",    href: "/inicio",    icon: Home,       minRole: "EMPLEADO" },
      { label: "Analytics", href: "/analytics", icon: BarChart2,  minRole: "MANAGER"  },
    ],
  },
  {
    label: "Personas",
    items: [
      { label: "Empleados",    href: "/empleados",    icon: Users,    minRole: "RRHH"     },
      { label: "Evaluaciones", href: "/evaluaciones", icon: Star,     minRole: "EMPLEADO" },
      { label: "Formación",    href: "/formacion",    icon: BookOpen, minRole: "EMPLEADO" },
    ],
  },
  {
    label: "Tiempo",
    items: [
      { label: "Jornada",   href: "/jornada",   icon: Clock,        minRole: "EMPLEADO" },
      { label: "Ausencias", href: "/ausencias", icon: CalendarDays, minRole: "EMPLEADO" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Configuración", href: "/configuracion", icon: Settings, minRole: "ADMIN" },
    ],
  },
];

const ROLE_HIERARCHY: Record<string, number> = {
  ADMIN: 4,
  RRHH: 3,
  MANAGER: 2,
  EMPLEADO: 1,
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  RRHH: "RRHH",
  MANAGER: "Manager",
  EMPLEADO: "Empleado",
};

function canSee(userRole: string, minRole: string): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 99);
}

interface SidebarProps {
  role: string;
  nombres?: string;
  apellidos?: string;
}

export default function Sidebar({ role, nombres = "", apellidos = "" }: SidebarProps) {
  const pathname = usePathname() || "/";
  const fullName = `${nombres} ${apellidos}`.trim() || "Usuario";

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 w-[232px] flex flex-col bg-bg border-r border-line-2 z-30"
    >
      <div className="flex items-center gap-2.5 px-3 py-3.5">
        <div className="relative w-7 h-7 rounded-lg bg-ink text-bg flex items-center justify-center font-mono text-[13px] font-semibold shrink-0 overflow-hidden">
          T
          <span
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 30% 25%, var(--accent) 0%, transparent 55%)",
              opacity: 0.55,
            }}
            aria-hidden
          />
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold leading-none text-ink">
            Termprotect
          </div>
          <div className="text-[10px] font-mono uppercase tracking-[0.06em] text-ink-3 mt-1">
            Personas · v2.4
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 pt-1 pb-3 overflow-y-auto">
        {NAV.map((section) => {
          const items = section.items.filter((it) => canSee(role, it.minRole));
          if (items.length === 0) return null;
          return (
            <div key={section.label} className="mb-3">
              <div className="px-2.5 mb-1.5 text-[9.5px] uppercase tracking-[0.12em] text-ink-4 font-semibold">
                {section.label}
              </div>
              <ul className="flex flex-col gap-px">
                {items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-colors",
                          isActive
                            ? "bg-surface text-ink shadow-sm"
                            : "text-ink-2 hover:bg-line hover:text-ink",
                        )}
                      >
                        {isActive ? (
                          <span
                            aria-hidden
                            className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r bg-accent"
                          />
                        ) : null}
                        <Icon className="w-[16px] h-[16px] shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge ? (
                          <span className="font-mono text-[10px] px-1.5 py-px rounded-full bg-accent-2 text-white dark:text-[#0a0e1a]">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-line-2 px-3 py-3 flex items-center gap-2.5">
        <Avatar name={fullName} size="lg" />
        <div className="flex flex-col min-w-0">
          <div className="text-[12.5px] font-medium text-ink truncate">{fullName}</div>
          <div className="text-[10.5px] font-mono uppercase tracking-[0.04em] text-ink-3">
            {ROLE_LABEL[role] ?? role}
          </div>
        </div>
      </div>
    </aside>
  );
}
