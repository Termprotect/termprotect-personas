"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

type Sede = { id: string; name: string };

export default function EmpleadosJornadaFilters({
  sedes,
  showSedeFilter,
}: {
  sedes: Sede[];
  showSedeFilter: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const sede = searchParams.get("sede") ?? "";
  const estado = searchParams.get("estado") ?? "";

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    startTransition(() => {
      router.push(`/jornada/empleados?${params.toString()}`);
    });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== (searchParams.get("q") ?? "")) updateParams({ q });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = q || sede || estado;

  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, apellido o DNI..."
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        {showSedeFilter && (
          <select
            value={sede}
            onChange={(e) => updateParams({ sede: e.target.value })}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-background"
          >
            <option value="">Todas las sedes</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={estado}
          onChange={(e) => updateParams({ estado: e.target.value })}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-background"
        >
          <option value="">Cualquier estado hoy</option>
          <option value="WORKING">Trabajando</option>
          <option value="ON_BREAK">En pausa</option>
          <option value="DONE">Jornada cerrada</option>
          <option value="IDLE">Sin fichar</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              startTransition(() => router.push("/jornada/empleados"));
            }}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
