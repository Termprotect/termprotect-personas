import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { buildEmployeeScope } from "@/lib/services/analytics/scope";
import { getMyBalance } from "@/lib/services/leaves/balance";
import { getSedeLeaveSummary } from "@/lib/services/leaves/sede-summary";
import {
  getTeamCalendar,
  type CalendarEvent,
  type CalendarLeaveType,
} from "@/lib/services/leaves/calendar";
import { getPendingLeaves } from "@/lib/services/leaves/pending-list";

import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { MiniKpiStrip } from "@/components/ui/mini-kpi";
import { MiniCard } from "@/components/analytics/mini-card";
import { Tag } from "@/components/ui/tag";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tbl,
  TblBody,
  TblCell,
  TblHead,
  TblHeadCell,
  TblHeadRow,
  TblRow,
} from "@/components/ui/tbl";

export const dynamic = "force-dynamic";

const DAY_HEADERS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

const MONTH_LABELS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const TYPE_COLOR: Record<CalendarLeaveType, { bg: string; label: string }> = {
  VACACIONES:           { bg: "var(--accent)",   label: "Vacaciones" },
  INCAPACIDAD_TEMPORAL: { bg: "var(--warn)",     label: "IT"         },
  PERMISO:              { bg: "var(--accent-2)", label: "Permiso"    },
  EXCEDENCIA:           { bg: "var(--neutral)",  label: "Excedencia" },
  OTRO:                 { bg: "var(--ink-3)",    label: "Otro"       },
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function formatLeaveType(type: string): string {
  return type
    .replace(/^PERMISO_/, "Permiso ")
    .replace(/^EXCEDENCIA_/, "Excedencia ")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}

interface DayCell {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

function buildDays(monthStart: Date, events: CalendarEvent[]): DayCell[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1);
  const monStart = (firstDay.getDay() + 6) % 7;

  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const cells: DayCell[] = [];

  for (let i = 0; i < monStart; i++) {
    const d = new Date(year, month, 1 - (monStart - i));
    cells.push({ date: d, inMonth: false, isToday: false, events: [] });
  }

  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day);
    const dayEvents = events.filter((e) => {
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dEnd = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        23,
        59,
        59,
        999,
      );
      const lrStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const lrEnd = new Date(
        end.getFullYear(),
        end.getMonth(),
        end.getDate(),
        23,
        59,
        59,
        999,
      );
      return lrStart <= dEnd && lrEnd >= dStart;
    });
    cells.push({
      date: d,
      inMonth: true,
      isToday: isSameDay(d, today),
      events: dayEvents,
    });
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    cells.push({ date: next, inMonth: false, isToday: false, events: [] });
  }

  return cells;
}

export default async function AusenciasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  const userId = session.user.id;
  const isManagerOrUp = can.viewTeamLeave(role);
  const isRrhhOrUp = can.viewAllLeave(role);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const scope = buildEmployeeScope({ role, userId, sedeId: undefined });

  const [balance, sedeSummary, calendar, pending] = await Promise.all([
    getMyBalance(userId, now),
    isRrhhOrUp ? getSedeLeaveSummary(now) : Promise.resolve({ sedes: [] }),
    isManagerOrUp
      ? getTeamCalendar(scope, monthStart)
      : Promise.resolve({ monthStart, monthEnd: monthStart, events: [] as CalendarEvent[] }),
    isManagerOrUp
      ? getPendingLeaves(scope, 20)
      : Promise.resolve({ items: [], total: 0 }),
  ]);

  const days = buildDays(monthStart, calendar.events);
  const consumptionPct =
    balance.totalDays > 0
      ? Math.round((balance.usedDays / balance.totalDays) * 100)
      : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <>
            Ausencias <em>de personas</em>
          </>
        }
        sub={`${MONTH_LABELS_ES[now.getMonth()]} ${now.getFullYear()} · ${pending.total} ${pending.total === 1 ? "solicitud pendiente" : "solicitudes pendientes"}`}
        actions={
          <>
            <Button variant="default" size="sm">
              Saldos
            </Button>
            {isManagerOrUp ? (
              <Button variant="default" size="sm">
                Aprobaciones [{pending.total}]
              </Button>
            ) : null}
            <Button variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5" /> Solicitar
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Mi saldo</CardTitle>
            <CardDescription>{balance.year}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="font-mono text-[44px] leading-none font-medium tabular-nums tracking-[-0.02em] text-ink">
              {balance.usedDays}
              <span className="text-ink-3 text-[24px]">/{balance.totalDays}</span>
            </div>
            <div className="text-[10.5px] font-mono uppercase tracking-[0.04em] text-ink-3">
              días de vacaciones
            </div>
            <div className="h-1.5 rounded-full bg-line overflow-hidden" aria-hidden>
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${consumptionPct}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line">
              <div className="flex flex-col">
                <span className="text-[9.5px] font-mono uppercase tracking-[0.04em] text-ink-3">
                  Usadas
                </span>
                <span className="font-mono text-[16px] tabular-nums text-ink">
                  {balance.usedDays}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9.5px] font-mono uppercase tracking-[0.04em] text-ink-3">
                  Pendientes
                </span>
                <span className="font-mono text-[16px] tabular-nums text-warn">
                  {balance.pendingDays}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9.5px] font-mono uppercase tracking-[0.04em] text-ink-3">
                  As. prop.
                </span>
                <span className="font-mono text-[16px] tabular-nums text-ink">
                  {balance.asuntosPropDays}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-9">
          <CardHeader>
            <CardTitle>Resumen por sede</CardTitle>
            <CardDescription>
              {isRrhhOrUp
                ? "Consumo de vacaciones del año en curso"
                : "Solo RRHH+ ven el resumen agregado por sede"}
            </CardDescription>
          </CardHeader>
          {isRrhhOrUp && sedeSummary.sedes.length > 0 ? (
            <MiniKpiStrip cols={Math.min(4, Math.max(2, sedeSummary.sedes.length))}>
              {sedeSummary.sedes.slice(0, 4).map((s) => (
                <MiniCard
                  key={s.sedeId}
                  label={s.sedeName}
                  value={`${s.usedDays}/${s.totalDays}`}
                  meta={
                    <span className="text-ink-3">
                      <span className="text-accent">{s.consumptionPct}%</span> consumo
                    </span>
                  }
                />
              ))}
            </MiniKpiStrip>
          ) : (
            <CardContent>
              <div className="text-[11px] font-mono uppercase tracking-[0.04em] text-ink-3 py-4 text-center">
                {isRrhhOrUp
                  ? "Sin saldos registrados este año"
                  : "No disponible para tu rol"}
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {isManagerOrUp ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Calendario de equipo</CardTitle>
              <CardDescription>
                {MONTH_LABELS_ES[monthStart.getMonth()]} {monthStart.getFullYear()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(Object.keys(TYPE_COLOR) as CalendarLeaveType[]).map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.04em] text-ink-3"
                >
                  <span
                    className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: TYPE_COLOR[t].bg }}
                    aria-hidden
                  />
                  {TYPE_COLOR[t].label}
                </span>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1.5 text-[10px] font-mono uppercase tracking-[0.06em] text-ink-3 mb-1.5">
              {DAY_HEADERS.map((d) => (
                <div key={d} className="px-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((cell) => {
                const isWeekend =
                  cell.date.getDay() === 0 || cell.date.getDay() === 6;
                return (
                  <div
                    key={isoDate(cell.date)}
                    className={`relative rounded-md border border-line-2 p-1.5 ${
                      cell.inMonth
                        ? isWeekend
                          ? "bg-bg-2/55"
                          : "bg-surface-2"
                        : "bg-surface-2 opacity-40"
                    }`}
                    style={{ aspectRatio: "1.4 / 1", minHeight: 64 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`font-mono text-[11px] tabular-nums font-medium ${
                          cell.isToday ? "text-accent" : "text-ink"
                        }`}
                      >
                        {cell.date.getDate()}
                      </span>
                      {cell.isToday ? (
                        <span className="text-[8.5px] font-mono uppercase tracking-[0.06em] text-accent">
                          HOY
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {cell.events.slice(0, 3).map((e) => {
                        const c = TYPE_COLOR[e.type];
                        return (
                          <span
                            key={e.id}
                            className="block text-[9px] font-mono px-1 py-px rounded truncate"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${c.bg} 22%, transparent)`,
                              color: c.bg,
                            }}
                            title={`${e.employeeName} · ${formatLeaveType(e.rawType)}`}
                          >
                            {e.employeeName.split(/\s+/)[0] || "—"}
                          </span>
                        );
                      })}
                      {cell.events.length > 3 ? (
                        <span className="text-[9px] font-mono text-ink-3 px-1">
                          +{cell.events.length - 3}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isManagerOrUp ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <div>
              <CardTitle>Solicitudes pendientes</CardTitle>
              <CardDescription>
                {pending.total} {pending.total === 1 ? "solicitud" : "solicitudes"} por revisar
              </CardDescription>
            </div>
          </CardHeader>
          {pending.items.length === 0 ? (
            <CardContent>
              <div className="text-[11px] font-mono uppercase tracking-[0.04em] text-ink-3 py-6 text-center">
                Sin solicitudes pendientes
              </div>
            </CardContent>
          ) : (
            <Tbl containerClassName="border-0 shadow-none rounded-none border-t border-line">
              <TblHead>
                <TblHeadRow>
                  <TblHeadCell>Empleado</TblHeadCell>
                  <TblHeadCell>Tipo</TblHeadCell>
                  <TblHeadCell>Inicio</TblHeadCell>
                  <TblHeadCell>Fin</TblHeadCell>
                  <TblHeadCell right>Días</TblHeadCell>
                  <TblHeadCell>Sede</TblHeadCell>
                  <TblHeadCell>Estado</TblHeadCell>
                  <TblHeadCell right>Acción</TblHeadCell>
                </TblHeadRow>
              </TblHead>
              <TblBody>
                {pending.items.map((it) => (
                  <TblRow key={it.id}>
                    <TblCell>
                      <span className="flex items-center gap-2">
                        <Avatar name={it.employeeName} size="md" />
                        <span className="font-medium text-ink">{it.employeeName}</span>
                      </span>
                    </TblCell>
                    <TblCell className="text-ink-2">
                      {formatLeaveType(it.type)}
                    </TblCell>
                    <TblCell mono>{formatShortDate(it.startDate)}</TblCell>
                    <TblCell mono>{formatShortDate(it.endDate)}</TblCell>
                    <TblCell mono right>
                      {it.totalDays}
                    </TblCell>
                    <TblCell>
                      <Tag>{it.sedeName.slice(0, 3).toUpperCase()}</Tag>
                    </TblCell>
                    <TblCell>
                      <Tag variant="warn" dot>
                        Pendiente
                      </Tag>
                    </TblCell>
                    <TblCell right>
                      <Link
                        href={`/empleados/${it.employeeId}`}
                        className="text-[12px] text-accent hover:underline font-medium"
                      >
                        Ver
                      </Link>
                    </TblCell>
                  </TblRow>
                ))}
              </TblBody>
            </Tbl>
          )}
        </Card>
      ) : null}
    </div>
  );
}
