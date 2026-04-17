const statusConfig: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  INVITADO: { label: "Invitado", bg: "bg-amber-50", text: "text-amber-700" },
  ACTIVE: { label: "Activo", bg: "bg-emerald-50", text: "text-emerald-700" },
  BAJA_MEDICA: { label: "Baja médica", bg: "bg-orange-50", text: "text-orange-700" },
  EXCEDENCIA: { label: "Excedencia", bg: "bg-sky-50", text: "text-sky-700" },
  BAJA_VOLUNTARIA: { label: "Baja voluntaria", bg: "bg-slate-100", text: "text-slate-600" },
  DESPIDO: { label: "Despido", bg: "bg-rose-50", text: "text-rose-700" },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? {
    label: status,
    bg: "bg-slate-100",
    text: "text-slate-600",
  };
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-md ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
}
