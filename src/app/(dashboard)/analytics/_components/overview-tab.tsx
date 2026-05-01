import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getOverviewKpis } from "@/lib/services/analytics/overview";
import { getMiniKpis } from "@/lib/services/analytics/mini-kpis";
import { getSedeGeo } from "@/lib/services/analytics/sede-geo";
import { getNineBox } from "@/lib/services/analytics/ninebox";
import { getAgePyramid } from "@/lib/services/analytics/age-pyramid";
import { getPresenceHeatmap } from "@/lib/services/analytics/presence-heatmap";
import { getRecentActivity } from "@/lib/services/analytics/activity";
import { getAlerts } from "@/lib/services/analytics/alerts";
import { getLast12MonthsBuckets, startOfYear } from "@/lib/services/analytics/date-range";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MiniKpiStrip } from "@/components/ui/mini-kpi";
import { Tag } from "@/components/ui/tag";
import { KpiCard } from "@/components/analytics/kpi-card";
import { MiniCard } from "@/components/analytics/mini-card";
import { HeadcountChart } from "@/components/analytics/headcount-chart";
import { DonutDistribucion } from "@/components/analytics/donut-distribucion";
import { AgePyramid } from "@/components/analytics/age-pyramid";
import { PresenceHeatmap } from "@/components/analytics/presence-heatmap";
import { VacacionesGauge } from "@/components/analytics/vacaciones-gauge";
import { MapaEspana } from "@/components/analytics/mapa-espana";
import { NineBox } from "@/components/analytics/nine-box";
import { ActivityFeed } from "@/components/analytics/activity-feed";
import { AlertsList } from "@/components/analytics/alerts-list";

import type { AnalyticsFilters } from "@/lib/validators/analytics";

interface OverviewTabProps {
  scope: Prisma.EmployeeWhereInput;
  filters: AnalyticsFilters;
}

async function getVacationsGaugeData(
  scope: Prisma.EmployeeWhereInput,
  now: Date,
): Promise<{
  months: { label: string; cumulative: number; target: number; isCurrent?: boolean }[];
  consumedPct: number;
  deltaVsPlan: number;
}> {
  const buckets = getLast12MonthsBuckets(now);
  const yearStart = startOfYear(now);

  const [vacationLeaves, balances] = await Promise.all([
    db.leaveRequest.findMany({
      where: {
        status: "APROBADA",
        type: "VACACIONES",
        employee: scope,
        startDate: { lte: now },
        endDate: { gte: yearStart },
      },
      select: { startDate: true, endDate: true, totalDays: true },
    }),
    db.leaveBalance.findMany({
      where: { year: now.getFullYear(), employee: scope },
      select: { totalDays: true },
    }),
  ]);

  const totalAvailable =
    balances.reduce((acc, b) => acc + (b.totalDays ?? 0), 0) || 1;

  let cumDays = 0;
  const months = buckets.map((b, i) => {
    const inBucket = vacationLeaves.reduce((acc, lr) => {
      const lrStart = new Date(lr.startDate);
      const lrEnd = new Date(lr.endDate);
      const start = lrStart > b.start ? lrStart : b.start;
      const end = lrEnd < b.end ? lrEnd : b.end;
      if (start > end) return acc;
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return acc + Math.max(0, days);
    }, 0);
    cumDays += inBucket;
    const cumulative = (cumDays / totalAvailable) * 100;
    const target = ((i + 1) / 12) * 100;
    const isCurrent =
      now.getFullYear() === b.start.getFullYear() && now.getMonth() === b.start.getMonth();
    return {
      label: b.label,
      cumulative: Math.round(cumulative * 10) / 10,
      target: Math.round(target * 10) / 10,
      isCurrent,
    };
  });

  const currentIdx = months.findIndex((m) => m.isCurrent);
  const idx = currentIdx >= 0 ? currentIdx : months.length - 1;
  const consumedPct = months[idx]?.cumulative ?? 0;
  const deltaVsPlan = consumedPct - (months[idx]?.target ?? 0);

  return { months, consumedPct, deltaVsPlan };
}

export async function OverviewTab({ scope, filters }: OverviewTabProps) {
  const now = new Date();

  const [
    overview,
    miniKpis,
    sedeGeo,
    nineBox,
    agePyramid,
    heatmap,
    activity,
    alerts,
    vacationsGauge,
  ] = await Promise.all([
    getOverviewKpis(scope, filters, now),
    getMiniKpis(scope, now),
    getSedeGeo(scope, now),
    getNineBox(scope),
    getAgePyramid(scope, now),
    getPresenceHeatmap(scope, now),
    getRecentActivity(scope, 20),
    getAlerts(scope, now),
    getVacationsGaugeData(scope, now),
  ]);

  const headcountSeries = overview.headcountTrend.map((p) => p.count);

  return (
    <div className="space-y-5">
      {/* Row 1: 4 KPIs grandes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Plantilla activa"
          value={overview.headcount.current}
          delta={overview.headcount.deltaYear}
          deltaLabel="vs hace 12m"
          sparkData={headcountSeries}
          sparkColor="var(--accent)"
          hint={`${overview.headcountTrend.length} meses de evolución`}
        />
        <KpiCard
          title="Rotación 12 meses"
          value={overview.rotation12m.rate}
          format="percent"
          deltaInverse
          hint={`${overview.rotation12m.leavers} bajas en el periodo`}
          sparkColor="var(--good)"
        />
        <KpiCard
          title="Absentismo del mes"
          value={overview.absenteeismMonth.rate}
          format="percent"
          deltaInverse
          hint={`${overview.absenteeismMonth.leaveDays} días sobre ${overview.absenteeismMonth.workingDays} laborables`}
          sparkColor="var(--warn)"
        />
        <KpiCard
          title="Nota media último ciclo"
          value={overview.evalScore.value}
          format="score"
          hint={overview.evalScore.cycleName ?? "Sin ciclos cerrados"}
          sparkColor="var(--accent-2)"
        />
      </div>

      {/* Row 2: 6 mini-KPIs strip */}
      <Card>
        <MiniKpiStrip cols={6}>
          <MiniCard
            label="Horas trabajadas mes"
            value={miniKpis.hoursWorkedMonth}
            meta="Total de fichajes"
          />
          <MiniCard
            label="Aprobaciones pdtes"
            value={miniKpis.pendingApprovals}
            meta="Por revisar"
          />
          <MiniCard
            label="PIPs activos"
            value={miniKpis.activePips}
            meta="Planes en curso"
          />
          <MiniCard
            label="Docs por vencer 30d"
            value={miniKpis.docsExpiringIn30d}
            meta={
              miniKpis.docsExpiringIn30d > 0 ? (
                <span className="text-warn">Acción pronto</span>
              ) : (
                "Al día"
              )
            }
          />
          <MiniCard
            label="Contratos a renovar"
            value={miniKpis.contractsToRenew}
            meta="Próximos 60d"
          />
          <MiniCard
            label="Horas FUNDAE YTD"
            value={miniKpis.fundaeHoursYtd}
            meta="Año en curso"
          />
        </MiniKpiStrip>
      </Card>

      {/* Row 3: Mapa + Headcount */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-7">
          <CardHeader>
            <div>
              <CardTitle>Sedes</CardTitle>
              <CardDescription>Distribución geográfica · headcount y absentismo</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <MapaEspana sedes={sedeGeo.sedes} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader>
            <div>
              <CardTitle>Evolución de plantilla</CardTitle>
              <CardDescription>Últimos 12 meses</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <HeadcountChart data={overview.headcountTrend} />
          </CardContent>
        </Card>
      </div>

      {/* Row 4: 9-box + Donut + Pyramid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-5">
          <CardHeader>
            <div>
              <CardTitle>Talento · 9-box</CardTitle>
              <CardDescription>Desempeño × potencial</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <NineBox
              cells={nineBox.cells}
              total={nineBox.total}
              cycleName={nineBox.cycleName}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardHeader>
            <div>
              <CardTitle>Distribución por sede</CardTitle>
              <CardDescription>Empleados activos</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <DonutDistribucion
              data={overview.sedeDistribution.map((s) => ({
                id: s.sedeId,
                label: s.sedeName,
                value: s.count,
              }))}
              totalLabel="EMPLEADOS"
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <div>
              <CardTitle>Pirámide de edad</CardTitle>
              <CardDescription>Plantilla activa</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <AgePyramid
              buckets={agePyramid.buckets}
              averageAge={agePyramid.averageAge}
              total={agePyramid.total}
            />
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Heatmap + Vacaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-7">
          <CardHeader>
            <div>
              <CardTitle>Presencia por sede · 30 días</CardTitle>
              <CardDescription>Δ vs presencia esperada</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <PresenceHeatmap rows={heatmap.rows} days={heatmap.days} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader>
            <div>
              <CardTitle>Vacaciones · consumo</CardTitle>
              <CardDescription>Año en curso vs target lineal</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <VacacionesGauge
              months={vacationsGauge.months}
              consumedPct={vacationsGauge.consumedPct}
              deltaVsPlan={vacationsGauge.deltaVsPlan}
            />
          </CardContent>
        </Card>
      </div>

      {/* Row 6: Alerts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-7">
          <CardHeader>
            <div>
              <CardTitle>Alertas destacadas</CardTitle>
              <CardDescription>Asuntos que requieren atención</CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <Tag variant="bad" dot>
                {alerts.totalsByLevel.critical} críticas
              </Tag>
              <Tag variant="warn" dot>
                {alerts.totalsByLevel.warning} aviso
              </Tag>
            </div>
          </CardHeader>
          <CardContent>
            <AlertsList items={alerts.items} compact />
          </CardContent>
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader>
            <div>
              <CardTitle>Actividad reciente</CardTitle>
              <CardDescription>Últimas acciones registradas</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ActivityFeed items={activity.items} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
