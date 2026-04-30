import type { Prisma } from "@prisma/client";
import { getWorkforceMetrics } from "@/lib/services/analytics/workforce";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/analytics/kpi-card";
import { SedeDistributionChart } from "@/components/analytics/charts/sede-distribution";
import { DistributionBarChart } from "@/components/analytics/charts/distribution-bar";
import { Users, UserPlus, UserMinus, Clock3 } from "lucide-react";
import type { AnalyticsFilters } from "@/lib/validators/analytics";

const CONTRACT_LABELS: Record<string, string> = {
  INDEFINIDO: "Indefinido",
  TEMPORAL: "Temporal",
  FORMACION: "Formación",
  PRACTICAS: "Prácticas",
};

interface WorkforceTabProps {
  scope: Prisma.EmployeeWhereInput;
  filters: AnalyticsFilters;
}

export async function WorkforceTab({ scope, filters }: WorkforceTabProps) {
  const data = await getWorkforceMetrics(scope, filters);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Headcount activo"
          value={data.headcount}
          icon={<Users className="w-4 h-4" />}
        />
        <KpiCard
          title="Altas (periodo)"
          value={data.newHires}
          icon={<UserPlus className="w-4 h-4" />}
        />
        <KpiCard
          title="Bajas (periodo)"
          value={data.leavers}
          icon={<UserMinus className="w-4 h-4" />}
        />
        <KpiCard
          title="Antigüedad media"
          value={data.avgTenureYears}
          format="decimal"
          hint="años"
          icon={<Clock3 className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Distribución por sede</CardTitle>
              <CardDescription>Empleados activos</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <SedeDistributionChart data={data.bySede} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Tipo de contrato</CardTitle>
              <CardDescription>Empleados activos</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <DistributionBarChart
              data={data.byContractType.map((c) => ({
                label: CONTRACT_LABELS[c.contractType] ?? c.contractType,
                count: c.count,
              }))}
              emptyTitle="Sin tipos de contrato registrados"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Departamentos</CardTitle>
              <CardDescription>Top 10 por headcount</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <DistributionBarChart
              layout="vertical"
              data={data.byDepartment.map((d) => ({ label: d.department, count: d.count }))}
              color="#A16207"
              emptyTitle="Sin departamentos registrados"
              height={Math.max(220, data.byDepartment.length * 28)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Pirámide de edad</CardTitle>
              <CardDescription>Empleados activos con fecha de nacimiento</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {data.ageDistribution ? (
              <DistributionBarChart
                data={data.ageDistribution.map((a) => ({ label: a.bucket, count: a.count }))}
                color="#78716B"
              />
            ) : (
              <div className="text-sm text-muted-foreground py-6 text-center">
                Sin datos suficientes de fecha de nacimiento
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard
          title="Tasa de rotación"
          value={data.turnoverRate}
          format="percent"
          hint="Últimos 12 meses"
        />
        <KpiCard
          title="Antigüedad media (años)"
          value={data.avgTenureYears}
          format="decimal"
          hint="Sólo empleados activos"
        />
      </div>
    </div>
  );
}
