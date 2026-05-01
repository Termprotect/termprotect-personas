import Link from "next/link";
export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/jornada" className="text-muted-foreground hover:text-muted-foreground text-sm">← Volver</Link>
      </div>
      <div className="bg-background rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground font-medium">Sección en construcción</p>
        <p className="text-muted-foreground text-sm mt-1">Disponible próximamente.</p>
      </div>
    </div>
  );
}
