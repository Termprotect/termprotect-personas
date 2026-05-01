import { History } from "lucide-react";

type HistoryItem = {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  changedBy: string;
  actorName: string | null;
  reason: string | null;
};

const fieldLabel: Record<string, string> = {
  sedeId: "Sede",
  position: "Cargo",
  department: "Departamento",
  reportsToId: "Jefe directo",
  contractType: "Tipo de contrato",
  workMode: "Modalidad",
  startDate: "Fecha de alta",
  endDate: "Fin de contrato",
  role: "Rol en la app",
  requiresDriving: "Conduce vehículos",
  socialSecurityNumber: "NAF",
  status: "Estado",
};

const valueLabel: Record<string, Record<string, string>> = {
  contractType: {
    INDEFINIDO: "Indefinido",
    TEMPORAL: "Temporal",
    FORMACION: "Formación",
    PRACTICAS: "Prácticas",
  },
  workMode: {
    PRESENCIAL: "Presencial",
    TELETRABAJO: "Teletrabajo",
    HIBRIDO: "Híbrido",
  },
  role: {
    ADMIN: "Administrador",
    RRHH: "RRHH",
    MANAGER: "Manager",
    EMPLEADO: "Empleado",
  },
  requiresDriving: {
    true: "Sí",
    false: "No",
  },
  status: {
    INVITADO: "Invitado",
    ACTIVE: "Activo",
    BAJA_MEDICA: "Baja médica",
    EXCEDENCIA: "Excedencia",
    BAJA_VOLUNTARIA: "Baja voluntaria",
    DESPIDO: "Despido",
  },
};

function formatValue(field: string, value: string | null) {
  if (value === null) return "—";
  return valueLabel[field]?.[value] ?? value;
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function HistoryList({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) {
    return <p className="text-[12.5px] text-ink-3">Sin cambios registrados.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((h) => (
        <li key={h.id} className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-line-2 flex items-center justify-center shrink-0 mt-0.5">
            <History className="w-3.5 h-3.5 text-ink-3" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-ink">
              <span className="font-medium">{fieldLabel[h.field] ?? h.field}</span>:{" "}
              <span className="text-ink-3 line-through">
                {formatValue(h.field, h.oldValue)}
              </span>{" "}
              → <span className="text-ink">{formatValue(h.field, h.newValue)}</span>
            </p>
            <p className="text-[11px] font-mono text-ink-4 mt-0.5">
              {formatDateTime(h.changedAt)}
              {h.actorName ? ` · por ${h.actorName}` : ""}
            </p>
            {h.reason && (
              <p className="text-[11.5px] text-ink-2 mt-1 italic">
                Motivo: {h.reason}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
