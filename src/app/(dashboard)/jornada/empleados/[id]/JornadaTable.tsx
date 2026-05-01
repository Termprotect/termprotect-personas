"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import ManualEntryModal from "./ManualEntryModal";
import { formatMinutes } from "@/lib/time";

type Row = {
  id: string | null;
  dateIso: string; // YYYY-MM-DD
  dateLabel: string;
  clockIn: string | null; // HH:MM
  clockOut: string | null; // HH:MM
  breakMinutes: number;
  worked: number;
  source: "WEB" | "MANUAL" | "MOBILE" | null;
  isManual: boolean;
  manualReason: string | null;
  notes: string | null;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayLabel: string | null;
};

type InitialValues = {
  date: string;
  clockIn?: string;
  clockOut?: string | null;
  breakMinutes?: number;
  notes?: string | null;
  isEdit: boolean;
};

export default function JornadaTable({
  employeeId,
  rows,
  canEdit,
}: {
  employeeId: string;
  rows: Row[];
  canEdit: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [initial, setInitial] = useState<InitialValues | null>(null);

  const openNew = (dateIso: string) => {
    setInitial({ date: dateIso, isEdit: false });
    setModalOpen(true);
  };

  const openEdit = (r: Row) => {
    setInitial({
      date: r.dateIso,
      clockIn: r.clockIn ?? "09:00",
      clockOut: r.clockOut,
      breakMinutes: r.breakMinutes,
      notes: r.notes,
      isEdit: true,
    });
    setModalOpen(true);
  };

  return (
    <>
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <Th>Fecha</Th>
                <Th>Entrada</Th>
                <Th>Salida</Th>
                <Th className="text-right">Pausa</Th>
                <Th className="text-right">Trabajado</Th>
                <Th>Origen</Th>
                {canEdit && <Th className="text-right">Acciones</Th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const empty = !r.id;
                const bg = r.isHoliday
                  ? "bg-destructive/10/30"
                  : r.isWeekend
                    ? "bg-secondary/40"
                    : "";
                return (
                  <tr
                    key={r.dateIso}
                    className={`border-b border-border last:border-0 hover:bg-secondary/70 ${bg}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground capitalize">
                        {r.dateLabel}
                      </p>
                      {r.holidayLabel && (
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-destructive mt-0.5">
                          {r.holidayLabel}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {r.clockIn ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {r.clockOut ?? (
                        empty ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="text-warning text-xs font-medium">
                            Abierto
                          </span>
                        )
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {!empty && r.breakMinutes > 0
                        ? formatMinutes(r.breakMinutes)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                      {!empty && r.clockOut ? formatMinutes(r.worked) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {empty ? (
                        <span className="text-muted-foreground">—</span>
                      ) : r.isManual ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 border border-warning/20 text-warning text-xs font-medium"
                          title={r.manualReason ?? undefined}
                        >
                          <Pencil className="w-3 h-3" />
                          Manual
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                          {r.source === "MOBILE" ? "Móvil" : "Web"}
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        {empty ? (
                          <button
                            type="button"
                            onClick={() => openNew(r.dateIso)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary hover:bg-info/10 rounded-md transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Añadir
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ManualEntryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        employeeId={employeeId}
        initialValues={initial}
      />
    </>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}
