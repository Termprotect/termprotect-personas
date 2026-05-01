import { Tag, type TagVariant } from "@/components/ui/tag";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldCheck } from "lucide-react";
import type { AlertItem } from "@/lib/services/analytics/alerts";

const SEVERITY_VARIANT: Record<AlertItem["severity"], TagVariant> = {
  critical: "bad",
  warning: "warn",
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
    <ul className="flex flex-col">
      {visible.map((it) => (
        <li
          key={it.id}
          className="grid items-center gap-3 py-2.5 border-b border-line last:border-b-0"
          style={{ gridTemplateColumns: "1fr auto auto" }}
        >
          <div className="min-w-0">
            <div className="text-[12.5px] text-ink truncate">{it.label}</div>
            <div className="text-[10.5px] font-mono uppercase tracking-[0.04em] text-ink-3 mt-0.5">
              {it.category}
            </div>
          </div>
          <div className="font-mono text-[14px] tabular-nums font-semibold text-ink">
            {it.count}
          </div>
          <Tag variant={SEVERITY_VARIANT[it.severity]} dot>
            {SEVERITY_LABEL[it.severity]}
          </Tag>
        </li>
      ))}
    </ul>
  );
}
