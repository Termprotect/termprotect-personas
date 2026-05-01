import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { buildEmployeeScope } from "@/lib/services/analytics/scope";
import { getMyToday } from "@/lib/services/jornada/today";
import { getTeamNow } from "@/lib/services/jornada/team-now";

import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { JornadaLive } from "@/components/jornada/jornada-live";

export const dynamic = "force-dynamic";

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

const DAY_LABELS_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtClockHHMM(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default async function JornadaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  const userId = session.user.id;
  const isManagerOrUp = can.viewTeamTimeEntries(role);

  const now = new Date();
  const dateLabel = `${capitalize(DAY_LABELS_ES[now.getDay()])}, ${now.getDate()} de ${MONTH_LABELS_ES[now.getMonth()]} ${now.getFullYear()}`;

  const scope = isManagerOrUp
    ? buildEmployeeScope({ role, userId, sedeId: undefined })
    : {};

  const [today, team] = await Promise.all([
    getMyToday(userId, now),
    isManagerOrUp ? getTeamNow(scope, now) : Promise.resolve(null),
  ]);

  const statusTag: { variant: "good" | "warn" | "bad" | "neutral"; label: string } =
    today.status === "TRABAJANDO"
      ? { variant: "good", label: "EN CURSO" }
      : today.status === "EN_PAUSA"
        ? { variant: "warn", label: "EN PAUSA" }
        : today.status === "FINALIZADA"
          ? { variant: "neutral", label: "FINALIZADA" }
          : { variant: "bad", label: "SIN FICHAR" };

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <>
            Jornada <em>de hoy</em>
          </>
        }
        sub={dateLabel}
        actions={
          <>
            <Button variant="default" size="sm">
              Mi historial
            </Button>
            {isManagerOrUp ? (
              <Button variant="primary" size="sm">
                Equipo
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-7">
          <CardHeader>
            <div className="flex items-baseline gap-2">
              <CardTitle>Reloj de fichaje</CardTitle>
              <Tag variant={statusTag.variant} dot>
                {statusTag.label}
              </Tag>
            </div>
            <CardDescription>
              {today.clockInAt
                ? `desde ${fmtClockHHMM(today.clockInAt)}${today.sedeName ? ` · ${today.sedeName}` : ""}`
                : today.sedeName
                  ? `sede ${today.sedeName}`
                  : "sin fichaje hoy"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JornadaLive
              initial={{
                clockInAt: today.clockInAt ? today.clockInAt.toISOString() : null,
                workedMinutes: today.workedMinutes,
                expectedMinutes: today.expectedMinutes,
                status: today.status,
              }}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <div className="flex items-baseline gap-2">
              <CardTitle>Equipo · ahora</CardTitle>
              <Tag variant="good" dot>
                EN VIVO
              </Tag>
            </div>
            <CardDescription>
              {team
                ? `${team.totalActive} empleados activos`
                : "Solo Manager+ ven el equipo en vivo"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {team ? (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <TeamCounter
                    label="Trabajando"
                    value={team.counts.trabajando}
                    dotColor="var(--good)"
                  />
                  <TeamCounter
                    label="En pausa"
                    value={team.counts.enPausa}
                    dotColor="var(--warn)"
                  />
                  <TeamCounter
                    label="Sin fichar"
                    value={team.counts.sinFichar}
                    dotColor="var(--bad)"
                  />
                  <TeamCounter
                    label="Vac/IT"
                    value={team.counts.vacIt}
                    dotColor="var(--ink-3)"
                  />
                </div>

                <div className="border-t border-line pt-3">
                  <div className="text-[10.5px] font-mono uppercase tracking-[0.08em] text-ink-3 mb-2">
                    Últimos fichajes
                  </div>
                  {team.recent.length === 0 ? (
                    <div className="text-[11px] font-mono text-ink-3">
                      Sin actividad de fichaje hoy
                    </div>
                  ) : (
                    <ul className="flex flex-col">
                      {team.recent.map((r) => (
                        <li
                          key={r.id}
                          className="grid items-center gap-2.5 py-1.5 border-b border-line last:border-b-0"
                          style={{ gridTemplateColumns: "60px 22px 1fr auto" }}
                        >
                          <span className="font-mono text-[10.5px] text-ink-3">
                            {fmtClockHHMM(r.clockIn)}
                          </span>
                          <Avatar name={r.employeeName} size="md" />
                          <span className="text-[12.5px] text-ink truncate">
                            <b className="font-medium">{r.employeeName}</b>
                            <span className="text-ink-3 ml-1">
                              {r.clockOut ? "salida" : "entrada"}
                            </span>
                          </span>
                          {r.sedeName ? (
                            <Tag>{r.sedeName.slice(0, 3).toUpperCase()}</Tag>
                          ) : (
                            <span className="font-mono text-[10px] text-ink-4">—</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <div className="text-[11px] font-mono uppercase tracking-[0.04em] text-ink-3 py-6 text-center">
                Permisos insuficientes
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TeamCounter({
  label,
  value,
  dotColor,
}: {
  label: string;
  value: number;
  dotColor: string;
}) {
  return (
    <div className="rounded-lg border border-line-2 bg-surface-2 p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: dotColor }}
          aria-hidden
        />
        <span className="text-[10.5px] font-mono uppercase tracking-[0.04em] text-ink-3">
          {label}
        </span>
      </div>
      <div className="font-mono text-[24px] font-medium leading-none tabular-nums tracking-[-0.02em] text-ink">
        {value}
      </div>
    </div>
  );
}
