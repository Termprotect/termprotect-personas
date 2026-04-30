import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MiniCardProps {
  label: string;
  value: string | number | null;
  hint?: string;
  className?: string;
}

const NUMBER_FMT = new Intl.NumberFormat("es-ES");

export function MiniCard({ label, value, hint, className }: MiniCardProps) {
  let display: string;
  if (value === null || value === undefined) display = "—";
  else if (typeof value === "number") display = NUMBER_FMT.format(value);
  else display = value;

  return (
    <Card className={cn("p-4", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-xl font-semibold text-slate-800 mt-2">{display}</p>
      {hint ? <p className="text-xs text-slate-500 mt-0.5">{hint}</p> : null}
    </Card>
  );
}
