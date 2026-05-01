const statusConfig: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  INVITADO: { label: "Invitado", bg: "bg-warning/10", text: "text-warning" },
  ACTIVE: { label: "Activo", bg: "bg-success/10", text: "text-success" },
  BAJA_MEDICA: { label: "Baja médica", bg: "bg-orange-50", text: "text-orange-700" },
  EXCEDENCIA: { label: "Excedencia", bg: "bg-sky-50", text: "text-sky-700" },
  BAJA_VOLUNTARIA: { label: "Baja voluntaria", bg: "bg-muted", text: "text-muted-foreground" },
  DESPIDO: { label: "Despido", bg: "bg-destructive/10", text: "text-destructive" },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? {
    label: status,
    bg: "bg-muted",
    text: "text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-md ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
}
