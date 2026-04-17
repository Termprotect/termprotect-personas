import Link from "next/link";
export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/jornada" className="text-slate-400 hover:text-slate-600 text-sm">← Volver</Link>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-slate-600 font-medium">Sección en construcción</p>
        <p className="text-slate-400 text-sm mt-1">Disponible próximamente.</p>
      </div>
    </div>
  );
}
