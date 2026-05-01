import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/tag";

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  userName: string;
  sedeName?: string | null;
  createdAt: Date | string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  emptyHint?: string;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE_EMPLOYEE: "creó empleado",
  EDIT_EMPLOYEE: "editó empleado",
  DELETE_EMPLOYEE: "eliminó empleado",
  CHANGE_EMPLOYEE_STATUS: "cambió estado",
  RESEND_INVITATION: "reenvió invitación",
  VIEW_DOCUMENT: "consultó documento",
  UPLOAD_DOCUMENT: "subió documento",
  CREATE_LEAVE_REQUEST: "solicitó ausencia",
  APPROVE_LEAVE: "aprobó ausencia",
  REJECT_LEAVE: "rechazó ausencia",
  CREATE_TIME_ENTRY: "fichó",
  EDIT_TIME_ENTRY: "editó fichaje",
  COMPLETE_EVALUATION: "completó evaluación",
  CHANGE_PASSWORD: "cambió contraseña",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.toLowerCase().replace(/_/g, " ");
}

function formatTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `hace ${diffD}d`;
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export function ActivityFeed({ items, emptyHint }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="text-[11px] font-mono uppercase tracking-[0.04em] text-ink-3 py-6 text-center">
        {emptyHint ?? "Sin actividad reciente"}
      </div>
    );
  }

  return (
    <ul className="flex flex-col">
      {items.map((it) => (
        <li
          key={it.id}
          className="grid items-center gap-3 py-2 border-b border-line last:border-b-0"
          style={{ gridTemplateColumns: "60px 22px 1fr auto" }}
        >
          <span className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-ink-3">
            {formatTime(it.createdAt)}
          </span>
          <Avatar name={it.userName || "·"} size="md" />
          <span className="text-[12.5px] text-ink-2 min-w-0 truncate">
            <b className="text-ink font-medium">{it.userName || "Usuario"}</b>{" "}
            <span className="text-ink-3">{actionLabel(it.action)}</span>
          </span>
          {it.sedeName ? (
            <Tag>{it.sedeName.slice(0, 3).toUpperCase()}</Tag>
          ) : (
            <span className="font-mono text-[10px] text-ink-4">—</span>
          )}
        </li>
      ))}
    </ul>
  );
}
