import type { Prisma } from "@prisma/client";
import { getLeaveMetrics, type LeaveListItem } from "@/lib/services/analytics/leaves";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LeavesStatusChart } from "@/components/analytics/charts/leaves-status";
import { DistributionBarChart } from "@/components/analytics/charts/distribution-bar";
import { CalendarClock, CalendarCheck, Inbox } from "lucide-react";
import type { AnalyticsFilters } from "@/lib/validators/analytics";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  VACACIONES: "Vacaciones",
  PERMISO_MATRIMONIO: "Matrimonio",
  PERMISO_NACIMIENTO: "Nacimiento",
  PERMISO_FALLECIMIENTO_1: "Fallecimiento 1er grado",
  PERMISO_FALLECIMIENTO_2: "Fallecimiento 2º grado",
  PERMISO_HOSPITALIZACION: "Hospitalización",
  PERMISO_MUDANZA: "Mudanza",
  PERMISO_DEBER_PUBLICO: "Deber público",
  PERMISO_EXAMEN: "Examen",
  PERMISO_LACTANCIA: "Lactancia",
  PERMISO_ASUNTOS_PROPIOS: "Asuntos propios",
  INCAPACIDAD_TEMPORAL: "Incapacidad temporal",
  EXCEDENCIA_VOLUNTARIA: "Excedencia voluntaria",
  EXCEDENCIA_HIJOS: "Excedencia hijos",
  EXCEDENCIA_FAMILIARES: "Excedencia familiares",
  OTRO: "Otro",
};

const DATE_FMT = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(iso: string) {
  try {
    return DATE_FMT.format(new Date(iso));
  } catch {
    return iso;
  }
}

interface LeavesTabProps {
  scope: Prisma.EmployeeWhereInput;
  filters: AnalyticsFilters;
}

function LeavesTable({ rows, emptyTitle }: { rows: LeaveListItem[]; emptyTitle: string }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        icon={<Inbox className="w-5 h-5" />}
        title={emptyTitle}
      />
    );
  }
  return (
    <div className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
            <th className="px-4 py-2.5 font-medium">Empleado</th>
            <th className="px-4 py-2.5 font-medium">Tipo</th>
            <th className="px-4 py-2.5 font-medium">Desde</th>
            <th className="px-4 py-2.5 font-medium">Hasta</th>
            <th className="px-4 py-2.5 font-medium text-right">Días</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50/60">
              <td className="px-4 py-2.5 text-slate-800">{r.employeeName}</td>
              <td className="px-4 py-2.5 text-slate-600">
                {LEAVE_TYPE_LABELS[r.type] ?? r.type}
              </td>
              <td className="px-4 py-2.5 text-slate-600">{formatDate(r.startDate)}</td>
              <td className="px-4 py-2.5 text-slate-600">{formatDate(r.endDate)}</td>
              <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                {r.totalDays}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export async function LeavesTab({ scope, filters }: LeavesTabProps) {
  const data = await getLeaveMetrics(scope, filters);

  const consumption = data.vacationConsumption;
  const consumptionPct = consumption.rate ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Consumo de vacaciones</CardTitle>
              <CardDescription>Año en curso · saldo agregado</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {consumption.totalDays > 0 ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-semibold text-slate-900">
                    {consumption.usedDays}
                    <span className="text-lg text-slate-400 font-medium">
                      {" / "}
                      {consumption.totalDays}
                    </span>
                  </span>
                  <span className="text-sm text-slate-500">
                    {consumptionPct.toFixed(0)}% consumido
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${Math.min(100, consumptionPct)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {consumption.pendingDays} días pendientes de aprobar
                </p>
              </div>
            ) : (
              <EmptyState
                compact
                icon={<CalendarCheck className="w-5 h-5" />}
                title="Sin saldos de vacaciones"
                description="Aún no se han creado saldos para el año en curso."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Asuntos propios</CardTitle>
              <CardDescription>Año en curso</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              compact
              icon={<CalendarClock className="w-5 h-5" />}
              title="Sin datos"
              description="Pendiente de añadir cupo de asuntos propios al saldo."
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Solicitudes por estado</CardTitle>
              <CardDescription>Periodo seleccionado</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <LeavesStatusChart data={data.byStatus} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Por tipo de ausencia</CardTitle>
              <CardDescription>Aprobadas en el periodo</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <DistributionBarChart
              layout="vertical"
              data={data.byType.map((t) => ({
                label: LEAVE_TYPE_LABELS[t.type] ?? t.type,
                count: t.count,
              }))}
              color="#0891b2"
              emptyTitle="Sin ausencias aprobadas"
              height={Math.max(220, data.byType.length * 32)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Por sede</CardTitle>
            <CardDescription>Ausencias aprobadas en el periodo</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <DistributionBarChart
            data={data.bySede.map((s) => ({ label: s.sedeName, count: s.count }))}
            emptyTitle="Sin ausencias por sede"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Backlog de aprobaciones</CardTitle>
            <CardDescription>{data.pendingApprovalsList.length} solicitudes pendientes</CardDescription>
          </div>
        </CardHeader>
        <LeavesTable
          rows={data.pendingApprovalsList}
          emptyTitle="No hay solicitudes pendientes"
        />
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Próximas ausencias aprobadas</CardTitle>
            <CardDescription>Siguientes 10 con fecha de inicio futura</CardDescription>
          </div>
        </CardHeader>
        <LeavesTable
          rows={data.upcomingApproved}
          emptyTitle="Sin ausencias futuras planificadas"
        />
      </Card>
    </div>
  );
}
