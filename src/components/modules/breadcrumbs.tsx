"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  inicio: "Inicio",
  empleados: "Empleados",
  jornada: "Jornada",
  ausencias: "Ausencias",
  evaluaciones: "Evaluaciones",
  formacion: "Formación",
  analytics: "Analytics",
  configuracion: "Configuración",
  nuevo: "Nuevo",
  editar: "Editar",
  fichar: "Fichar",
  "mi-jornada": "Mi jornada",
  "mi-saldo": "Mi saldo",
  solicitar: "Solicitar",
  aprobar: "Aprobar",
};

function labelFor(slug: string): string {
  if (LABELS[slug]) return LABELS[slug];
  if (/^[a-f0-9-]{8,}$/i.test(slug)) return slug.slice(0, 6);
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function Breadcrumbs() {
  const pathname = usePathname() || "/";
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.04em]"
    >
      {segments.map((seg, idx) => {
        const isLast = idx === segments.length - 1;
        const href = "/" + segments.slice(0, idx + 1).join("/");
        const label = labelFor(seg);
        return (
          <span key={href} className="flex items-center gap-1.5">
            {idx > 0 ? <span className="text-ink-4">/</span> : null}
            {isLast ? (
              <span className="text-ink font-medium">{label}</span>
            ) : (
              <Link href={href} className="text-ink-3 hover:text-ink transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
