"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  Edit3,
  X,
} from "lucide-react";

type Row = {
  employeeId: string;
  nombres: string;
  apellidos: string;
  status: string;
  sedeId: string;
  sedeName: string;
  hasBalance: boolean;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  personalTotal: number;
  personalUsed: number;
  personalPending: number;
};

export default function SaldosClient({
  year,
  sedeId,
  rows,
}: {
  year: number;
  sedeId: string | null;
  rows: Row[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vac, setVac] = useState("");
  const [per, setPer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const openEdit = (r: Row) => {
    setEditingId(r.employeeId);
    setVac(String(r.totalDays));
    setPer(String(r.personalTotal));
    setError(null);
    setInfo(null);
  };

  const save = (employeeId: string) => {
    const totalDays = Number(vac);
    const personalTotal = Number(per);
    if (!Number.isFinite(totalDays) || totalDays < 0 || totalDays > 60) {
      setError("Vacaciones debe estar entre 0 y 60");
      return;
    }
    if (!Number.isFinite(personalTotal) || personalTotal < 0 || personalTotal > 20) {
      setError("Asuntos propios debe estar entre 0 y 20");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/leave-balances", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId, year, totalDays, personalTotal }),
        });
        const j = await res.json();
        if (!res.ok) {
          setError(j.error ?? "No se pudo guardar");
          return;
        }
        setEditingId(null);
        setInfo("Saldo actualizado");
        router.refresh();
      } catch {
        setError("Error de red");
      }
    });
  };

  const bootstrap = () => {
    if (
      !confirm(
        `¿Inicializar saldos del año ${year} para los empleados sin saldo${
          sedeId ? " de esta sede" : ""
        }?`
      )
    )
      return;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/leave-balances/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year, sedeId }),
        });
        const j = await res.json();
        if (!res.ok) {
          setError(j.error ?? "No se pudo inicializar");
          return;
        }
        setInfo(`Creados ${j.created}. Existentes: ${j.skipped}.`);
        router.refresh();
      } catch {
        setError("Error de red");
      }
    });
  };

  return (
    <div className="bg-background rounded-xl border border-border overflow-hidden">
      {/* Header de acciones */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-muted-foreground">
          Ajusta manualmente el cupo anual de cada empleado. Usados y pendientes
          se recalculan automáticamente a partir de solicitudes.
        </p>
        <button
          onClick={bootstrap}
          disabled={pending}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <PlayCircle className="w-4 h-4" />
          )}
          Inicializar {year}
        </button>
      </div>

      {error && (
        <div className="px-5 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
      {info && (
        <div className="px-5 py-2 bg-success/10 border-b border-success/20 text-success text-xs flex items-center gap-2">
          <CheckCircle2 className="w-3 h-3" />
          {info}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2 font-semibold">Empleado</th>
              <th className="text-left px-4 py-2 font-semibold">Sede</th>
              <th className="text-center px-3 py-2 font-semibold" colSpan={4}>
                Vacaciones
              </th>
              <th className="text-center px-3 py-2 font-semibold" colSpan={4}>
                Asuntos propios
              </th>
              <th className="px-3 py-2"></th>
            </tr>
            <tr className="text-[10px] text-muted-foreground">
              <th></th>
              <th></th>
              <th className="text-right px-2 py-1">Total</th>
              <th className="text-right px-2 py-1">Usados</th>
              <th className="text-right px-2 py-1">Pend.</th>
              <th className="text-right px-2 py-1">Disp.</th>
              <th className="text-right px-2 py-1">Total</th>
              <th className="text-right px-2 py-1">Usados</th>
              <th className="text-right px-2 py-1">Pend.</th>
              <th className="text-right px-2 py-1">Disp.</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const vacAvail = r.totalDays - r.usedDays - r.pendingDays;
              const perAvail =
                r.personalTotal - r.personalUsed - r.personalPending;
              const editing = editingId === r.employeeId;
              return (
                <tr key={r.employeeId} className="hover:bg-secondary">
                  <td className="px-4 py-2">
                    <div className="font-medium text-foreground">
                      {r.apellidos}, {r.nombres}
                    </div>
                    {!r.hasBalance && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-warning/10 text-warning border border-warning/20 rounded-md font-semibold">
                        Sin inicializar
                      </span>
                    )}
                    {r.status !== "ACTIVE" && (
                      <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded-md font-semibold">
                        {r.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{r.sedeName}</td>
                  <td className="text-right px-2 py-2">
                    {editing ? (
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={vac}
                        onChange={(e) => setVac(e.target.value)}
                        className="w-16 px-2 py-1 border border-border rounded-md text-xs text-right"
                      />
                    ) : (
                      <span className="font-semibold text-foreground">
                        {r.totalDays}
                      </span>
                    )}
                  </td>
                  <td className="text-right px-2 py-2 text-success">
                    {r.usedDays}
                  </td>
                  <td className="text-right px-2 py-2 text-warning">
                    {r.pendingDays}
                  </td>
                  <td className="text-right px-2 py-2 font-semibold text-primary">
                    {vacAvail}
                  </td>
                  <td className="text-right px-2 py-2">
                    {editing ? (
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={per}
                        onChange={(e) => setPer(e.target.value)}
                        className="w-16 px-2 py-1 border border-accent/50 rounded-md text-xs text-right"
                      />
                    ) : (
                      <span className="font-semibold text-foreground">
                        {r.personalTotal}
                      </span>
                    )}
                  </td>
                  <td className="text-right px-2 py-2 text-success">
                    {r.personalUsed}
                  </td>
                  <td className="text-right px-2 py-2 text-warning">
                    {r.personalPending}
                  </td>
                  <td className="text-right px-2 py-2 font-semibold text-primary">
                    {perAvail}
                  </td>
                  <td className="text-right px-3 py-2">
                    {editing ? (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => save(r.employeeId)}
                          disabled={pending}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-success hover:bg-success/90 text-white text-xs font-semibold rounded-md disabled:opacity-60"
                        >
                          {pending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-muted-foreground hover:bg-muted rounded-md"
                          disabled={pending}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openEdit(r)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-md"
                      >
                        <Edit3 className="w-3 h-3" />
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="p-8 text-center text-muted-foreground text-sm">
          No hay empleados con el filtro seleccionado.
        </div>
      )}
    </div>
  );
}
