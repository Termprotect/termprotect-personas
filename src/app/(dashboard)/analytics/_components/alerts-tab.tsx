import type { Prisma } from "@prisma/client";
import { getAlerts } from "@/lib/services/analytics/alerts";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertsList } from "@/components/analytics/alerts-list";
import { KpiCard } from "@/components/analytics/kpi-card";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

interface AlertsTabProps {
  scope: Prisma.EmployeeWhereInput;
}

export async function AlertsTab({ scope }: AlertsTabProps) {
  const data = await getAlerts(scope);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Críticas"
          value={data.totalsByLevel.critical}
          icon={<AlertCircle className="w-4 h-4 text-destructive" />}
          hint="Atención inmediata"
        />
        <KpiCard
          title="Atención"
          value={data.totalsByLevel.warning}
          icon={<AlertTriangle className="w-4 h-4 text-warning" />}
          hint="Revisar pronto"
        />
        <KpiCard
          title="Avisos"
          value={data.totalsByLevel.info}
          icon={<Info className="w-4 h-4 text-primary" />}
          hint="Informativo"
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Detalle de alertas</CardTitle>
            <CardDescription>
              Asuntos detectados en la plantilla, documentación y cumplimiento.
            </CardDescription>
          </div>
        </CardHeader>
        <AlertsList items={data.items} />
      </Card>
    </div>
  );
}
