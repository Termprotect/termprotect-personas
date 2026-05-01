import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { User, Clock } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMinutes, formatTime, startOfDay, workedMinutes } from "@/lib/time";
import { computeJornadaAlerts } from "@/lib/services/jornada-alerts";
import EmpleadosJornadaFilters from "./EmpleadosJornadaFilters";
import AlertsPanel from "./AlertsPanel";

export const dynamic = "force-dynamic";

type DayState = "IDLE" | "WORKING" | "ON_BREAK" | "DONE";

export default async function JornadaEmpleadosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sede?: string; estado?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  const canAccess = role === "ADMIN" || role === "RRHH" || role === "MANAGER";
  if (!canAccess) redirect("/jornada");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const sedeFilter = sp.sede ?? "";
  const estadoFilter = (sp.estado ?? "") as DayState | "";

  // Base where según rol
  const where: Prisma.EmployeeWhereInput = {
    status: { in: ["ACTIVE", "BAJA_MEDICA", "EXCEDENCIA"] },
  };
  if (role === "MANAGER") {
    where.reportsToId = session.user.id;
  }
  if (q) {
    where.OR = [
      { nombres: { contains: q, mode: "insensitive" } },
      { apellidos: { contains: q, mode: "insensitive" } },
      { documentNumber: { contains: q, mode: "insensitive" } },
    ];
  }
  if (sedeFilter) where.sedeId = sedeFilter;

  const today = startOfDay();

  const sedes =
    role === "MANAGER"
      ? []
      : await db.sede.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        });

  const [employees, alerts] = await Promise.all([
    db.employee.findMany({
      where,
      include: {
        sede: { select: { name: true } },
        timeEntries: {
          where: { date: today },
          take: 1,
        },
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    computeJornadaAlerts({
      sedeId: sedeFilter || undefined,
      reportsToId: role === "MANAGER" ? session.user.id : undefined,
    }),
  ]);

  const alertsForClient = alerts.map((a) => ({
    id: a.id,
    severity: a.severity,
    kind: a.kind,
    message: a.message,
    employeeId: a.employeeId,
    employeeName: a.employeeName,
    dateIso: a.date ? toIso(a.date) : null,
  }));

  const now = new Date();

  // Enriquecer con estado derivado
  const rows = employees.map((e) => {
    const entry = e.timeEntries[0];
    const state: DayState = !entry
      ? "IDLE"
      : entry.clockOut
        ? "DONE"
        : entry.breakStartedAt
          ? "ON_BREAK"
          : "WORKING";
    const worked = entry ? workedMinutes(entry, now) : 0;
    return { employee: e, entry, state, worked };
  });

  // Filtro de estado de hoy
  const filtered = estadoFilter
    ? rows.filter((r) => r.state === estadoFilter)
    : rows;

  // Resumen
  const summary = rows.reduce(
    (acc, r) => {
      acc[r.state] += 1;
      return acc;
    },
    { IDLE: 0, WORKING: 0, ON_BREAK: 0, DONE: 0 } as Record<DayState, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Control de equipo
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {role === "MANAGER"
              ? "Fichajes de tu equipo directo."
              : "Fichajes de toda la plantilla."}
          </p>
        </div>
        <Link
          href="/jornada"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Trabajando" value={summary.WORKING} color="emerald" />
        <SummaryCard label="En pausa" value={summary.ON_BREAK} color="amber" />
        <SummaryCard label="Cerrada" value={summary.DONE} color="slate" />
        <SummaryCard label="Sin fichar" value={summary.IDLE} color="rose" />
      </div>

      <AlertsPanel alerts={alertsForClient} />

      <EmpleadosJornadaFilters
        sedes={sedes}
        showSedeFilter={role !== "MANAGER"}
      />

      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground font-medium">Sin resultados</p>
            <p className="text-muted-foreground text-sm mt-1">
              Ajusta los filtros de búsqueda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-border">
                <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Empleado</th>
                  <th className="px-4 py-3 font-medium">Sede</th>
                  <th className="px-4 py-3 font-medium">Estado hoy</th>
                  <th className="px-4 py-3 font-medium">Entrada</th>
                  <th className="px-4 py-3 font-medium">Salida</th>
                  <th className="px-4 py-3 font-medium text-right">Trabajado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(({ employee: e, entry, state, worked }) => (
                  <tr key={e.id} className="hover:bg-secondary transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/jornada/empleados/${e.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <div className="w-9 h-9 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
                          {e.photoUrl ? (
                            <Image
                              src={e.photoUrl}
                              alt={`${e.nombres} ${e.apellidos}`}
                              width={36}
                              height={36}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground group-hover:text-accent transition-colors">
                            {e.apellidos}, {e.nombres}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {e.position ?? "—"}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{e.sede.name}</td>
                    <td className="px-4 py-3">
                      <StateBadge state={state} />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {entry ? formatTime(entry.clockIn) : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {entry?.clockOut ? formatTime(entry.clockOut) : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium text-foreground text-right">
                      {entry ? formatMinutes(worked) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "amber" | "slate" | "rose";
}) {
  const bg = {
    emerald: "bg-success/10 border-success/20 text-success",
    amber: "bg-warning/10 border-warning/20 text-warning",
    slate: "bg-secondary border-border text-foreground",
    rose: "bg-destructive/10 border-destructive/20 text-destructive",
  }[color];
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
    </div>
  );
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function StateBadge({ state }: { state: DayState }) {
  const cfg = {
    IDLE: { label: "Sin fichar", cls: "bg-muted text-muted-foreground" },
    WORKING: { label: "Trabajando", cls: "bg-success/10 text-success" },
    ON_BREAK: { label: "En pausa", cls: "bg-warning/10 text-warning" },
    DONE: { label: "Cerrada", cls: "bg-muted text-foreground" },
  }[state];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}
    >
      <Clock className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}
