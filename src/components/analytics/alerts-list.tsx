import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldCheck } from "lucide-react";
import type { AlertItem } from "@/lib/services/analytics/alerts";

const SEVERITY_VARIANT: Record<AlertItem["severity"], BadgeVariant> = {
  critical: "danger",
  warning: "warning",
  info: "info",
};

const SEVERITY_LABEL: Record<AlertItem["severity"], string> = {
  critical: "Crítica",
  warning: "Atención",
  info: "Aviso",
};

interface AlertsListProps {
  items: AlertItem[];
  hideEmpty?: boolean;
  compact?: boolean;
}

export function AlertsList({ items, hideEmpty = false, compact = false }: AlertsListProps) {
  const visible = items.filter((it) => it.count > 0);

  if (visible.length === 0) {
    if (hideEmpty) return null;
    return (
      <EmptyState
        compact={compact}
        icon={<ShieldCheck className="w-5 h-5" />}
        title="Sin alertas activas"
        description="Todo está al día. Vuelve a comprobar más tarde."
      />
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
            <th className="px-4 py-2.5 font-medium">Categoría</th>
            <th className="px-4 py-2.5 font-medium">Alerta</th>
            <th className="px-4 py-2.5 font-medium text-right">Total</th>
            <th className="px-4 py-2.5 font-medium">Nivel</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {visible.map((it) => (
            <tr key={it.id} className="hover:bg-slate-50/60">
              <td className="px-4 py-2.5 text-slate-500 text-xs">{it.category}</td>
              <td className="px-4 py-2.5 text-slate-800">{it.label}</td>
              <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                {it.count}
              </td>
              <td className="px-4 py-2.5">
                <Badge variant={SEVERITY_VARIANT[it.severity]}>
                  {SEVERITY_LABEL[it.severity]}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
