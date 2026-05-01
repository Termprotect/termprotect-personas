"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, AlertOctagon, Info, ChevronDown } from "lucide-react";
import { formatDateShort } from "@/lib/time";

type Alert = {
  id: string;
  severity: "warning" | "danger" | "info";
  kind: string;
  message: string;
  employeeId: string;
  employeeName: string;
  dateIso?: string | null;
};

export default function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const [open, setOpen] = useState(true);

  if (alerts.length === 0) {
    return (
      <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-success text-sm flex items-center gap-2">
        <Info className="w-4 h-4" />
        Sin anomalías detectadas. Todo en orden.
      </div>
    );
  }

  const dangerCount = alerts.filter((a) => a.severity === "danger").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;
  const infoCount = alerts.filter((a) => a.severity === "info").length;

  return (
    <div className="bg-background rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">
              {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"} a revisar
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dangerCount > 0 && `${dangerCount} urgentes · `}
              {warningCount > 0 && `${warningCount} avisos · `}
              {infoCount > 0 && `${infoCount} informativas`}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border max-h-96 overflow-y-auto">
          {alerts.map((a) => (
            <AlertRow key={a.id} alert={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert: a }: { alert: Alert }) {
  const Icon =
    a.severity === "danger"
      ? AlertOctagon
      : a.severity === "warning"
        ? AlertTriangle
        : Info;
  const color =
    a.severity === "danger"
      ? "text-destructive"
      : a.severity === "warning"
        ? "text-warning"
        : "text-muted-foreground";

  const dateLabel = a.dateIso
    ? formatDateShort(new Date(a.dateIso))
    : null;

  const href = buildHref(a);

  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-3 hover:bg-secondary transition-colors"
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          <span className="font-medium">{a.employeeName}</span>
          <span className="text-muted-foreground"> · {a.message}</span>
        </p>
        {dateLabel && (
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
            {dateLabel}
          </p>
        )}
      </div>
    </Link>
  );
}

function buildHref(a: Alert): string {
  if (a.dateIso) {
    const month = a.dateIso.slice(0, 7);
    return `/jornada/empleados/${a.employeeId}?month=${month}`;
  }
  return `/jornada/empleados/${a.employeeId}`;
}
