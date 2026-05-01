"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { Search, X } from "lucide-react";

type Sede = { id: string; name: string };

export default function EmpleadosFilters({ sedes }: { sedes: Sede[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const sede = searchParams.get("sede") ?? "";
  const estado = searchParams.get("estado") ?? "";
  const rol = searchParams.get("rol") ?? "";

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    params.delete("page");
    startTransition(() => {
      router.push(`/empleados?${params.toString()}`);
    });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== (searchParams.get("q") ?? "")) updateParams({ q });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = q || sede || estado || rol;

  const selectCls =
    "h-8 px-3 border border-line-2 rounded-lg text-[12.5px] bg-surface text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors";

  return (
    <div className="rounded-xl border border-line-2 bg-surface shadow-sm p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[260px]">
          <Search
            className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nombre, apellido, DNI o email…"
            className="w-full h-8 pl-9 pr-3 rounded-lg border border-line-2 bg-surface text-[12.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />
        </div>

        <select
          value={sede}
          onChange={(e) => updateParams({ sede: e.target.value })}
          className={selectCls}
          aria-label="Sede"
        >
          <option value="">Todas las sedes</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={estado}
          onChange={(e) => updateParams({ estado: e.target.value })}
          className={selectCls}
          aria-label="Estado"
        >
          <option value="">Todos los estados</option>
          <option value="INVITADO">Invitado</option>
          <option value="ACTIVE">Activo</option>
          <option value="BAJA_MEDICA">Baja médica</option>
          <option value="EXCEDENCIA">Excedencia</option>
          <option value="BAJA_VOLUNTARIA">Baja voluntaria</option>
          <option value="DESPIDO">Despido</option>
        </select>

        <select
          value={rol}
          onChange={(e) => updateParams({ rol: e.target.value })}
          className={selectCls}
          aria-label="Rol"
        >
          <option value="">Todos los roles</option>
          <option value="ADMIN">Administrador</option>
          <option value="RRHH">RRHH</option>
          <option value="MANAGER">Manager</option>
          <option value="EMPLEADO">Empleado</option>
        </select>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              startTransition(() => router.push("/empleados"));
            }}
            className="inline-flex items-center gap-1 h-8 px-2.5 text-[12px] text-ink-3 hover:text-ink hover:bg-line transition-colors rounded-md"
          >
            <X className="w-3.5 h-3.5" aria-hidden />
            Limpiar
          </button>
        ) : null}
      </div>
    </div>
  );
}
