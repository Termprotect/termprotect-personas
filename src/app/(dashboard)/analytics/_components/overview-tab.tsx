import type { Prisma } from "@prisma/client";
import { getOverviewKpis } from "@/lib/services/analytics/overview";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KpiCard } from "@/components/analytics/kpi-card";
import { MiniCard } from "@/components/analytics/mini-card";
import { AlertsList } from "@/components/analytics/alerts-list";
import { HeadcountTrendChart } from "@/components/analytics/charts/headcount-trend";
import { SedeDistributionChart } from "@/components/analytics/charts/sede-distribution";
import {
  Users,
  TrendingDown,
  Activity,
  Star,
} from "lucide-react";
import type { AnalyticsFilters } from "@/lib/validators/analytics";

interface OverviewTabProps {
  scope: Prisma.EmployeeWhereInput;
  filters: AnalyticsFilters;
}

export async function OverviewTab({ scope, filters }: OverviewTabProps) {
  const data = await getOverviewKpis(scope, filters);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Plantilla activa"
          value={data.headcount.current}
          delta={data.headcount.deltaYear}
          deltaLabel="vs 12 meses"
          icon={<Users className="w-4 h-4" />}
        />
        <KpiCard
          title="Rotación 12 meses"
          value={data.rotation12m.rate}
          format="percent"
          hint={`${data.rotation12m.leavers} bajas en el periodo`}
          icon={<TrendingDown className="w-4 h-4" />}
        />
        <KpiCard
          title="Absentismo del mes"
          value={data.absenteeismMonth.rate}
          format="percent"
          hint={`${data.absenteeismMonth.leaveDays} días de ausencia`}
          icon={<Activity className="w-4 h-4" />}
        />
        <KpiCard
          title="Nota media último ciclo"
          value={data.evalScore.value}
          format="score"
          hint={data.evalScore.cycleName ?? "Sin ciclos cerrados"}
          icon={<Star className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MiniCard
          label="Horas trabajadas (mes)"
          value={data.hoursWorkedMonth !== null ? `${data.hoursWorkedMonth.toFixed(0)} h` : null}
          hint="Suma de fichajes del mes"
        />
        <MiniCard
          label="Aprobaciones pendientes"
          value={data.pendingApprovals}
          hint="Solicitudes por revisar"
        />
        <MiniCard
          label="PIPs activos"
          value={data.activePips}
          hint="Planes de mejora en curso"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Evolución de plantilla</CardTitle>
              <CardDescription>Últimos 12 meses</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <HeadcountTrendChart data={data.headcountTrend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Distribución por sede</CardTitle>
              <CardDescription>Empleados activos</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <SedeDistributionChart data={data.sedeDistribution} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Alertas destacadas</CardTitle>
            <CardDescription>Asuntos que requieren atención</CardDescription>
          </div>
        </CardHeader>
        <AlertsList
          items={data.topAlerts.map((a) => ({
            id: a.id,
            category: "Resumen",
            label: a.label,
            count: a.count,
            severity: a.severity,
          }))}
          compact
        />
      </Card>
    </div>
  );
}
