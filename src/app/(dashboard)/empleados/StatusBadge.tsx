import { Tag, type TagVariant } from "@/components/ui/tag";

const STATUS_CFG: Record<string, { label: string; variant: TagVariant }> = {
  INVITADO:        { label: "Invitado",        variant: "info"    },
  ACTIVE:          { label: "Activo",          variant: "good"    },
  BAJA_MEDICA:     { label: "Baja médica",     variant: "warn"    },
  EXCEDENCIA:      { label: "Excedencia",      variant: "info"    },
  BAJA_VOLUNTARIA: { label: "Baja voluntaria", variant: "neutral" },
  DESPIDO:         { label: "Despido",         variant: "bad"     },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, variant: "neutral" as TagVariant };
  return (
    <Tag variant={cfg.variant} dot>
      {cfg.label}
    </Tag>
  );
}
