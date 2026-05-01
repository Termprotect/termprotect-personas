import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import FestivosManager from "./FestivosManager";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ year?: string }>;

export default async function FestivosPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RRHH") redirect("/inicio");

  const { id } = await params;
  const sp = await searchParams;
  const year = parseInt(sp.year ?? String(new Date().getFullYear()), 10);

  const sede = await db.sede.findUnique({ where: { id } });
  if (!sede) notFound();

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const holidays = await db.sedeCalendar.findMany({
    where: { sedeId: id, date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
  });

  // Serializar dates para el cliente
  const items = holidays.map((h) => ({
    id: h.id,
    date: toIso(h.date),
    description: h.description,
    type: h.type,
  }));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href={`/configuracion/sedes/${id}`}
          className="text-sm text-muted-foreground hover:text-muted-foreground"
        >
          ← {sede.name}
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Calendario laboral
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {sede.name} · Año {year}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/configuracion/sedes/${id}/festivos?year=${year - 1}`}
            className="inline-flex items-center gap-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-border"
          >
            <ChevronLeft className="w-4 h-4" />
            {year - 1}
          </Link>
          <span className="px-3 py-2 text-sm font-semibold text-foreground">
            {year}
          </span>
          <Link
            href={`/configuracion/sedes/${id}/festivos?year=${year + 1}`}
            className="inline-flex items-center gap-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-border"
          >
            {year + 1}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <FestivosManager sedeId={id} year={year} initialItems={items} />
    </div>
  );
}

function toIso(d: Date): string {
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}
