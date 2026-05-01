import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import PoliticasForm from "./PoliticasForm";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ year?: string }>;

export default async function PoliticasPage({
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

  const [sede, policy, previous] = await Promise.all([
    db.sede.findUnique({ where: { id } }),
    db.sedePolicy.findUnique({
      where: { sedeId_year: { sedeId: id, year } },
    }),
    db.sedePolicy.findUnique({
      where: { sedeId_year: { sedeId: id, year: year - 1 } },
    }),
  ]);
  if (!sede) notFound();

  const initial = policy
    ? {
        vacationDays: policy.vacationDays,
        extraPersonalDays: policy.extraPersonalDays,
        notes: policy.notes ?? "",
      }
    : previous
      ? {
          vacationDays: previous.vacationDays,
          extraPersonalDays: previous.extraPersonalDays,
          notes: previous.notes ?? "",
        }
      : {
          vacationDays: sede.vacationDays,
          extraPersonalDays: 0,
          notes: "",
        };

  return (
    <div className="space-y-6 max-w-3xl">
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
          <h1 className="text-2xl font-bold text-foreground">Política anual</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {sede.name} · Año {year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/configuracion/sedes/${id}/politicas?year=${year - 1}`}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-border"
          >
            {year - 1}
          </Link>
          <span className="px-3 py-2 text-sm font-semibold text-foreground">
            {year}
          </span>
          <Link
            href={`/configuracion/sedes/${id}/politicas?year=${year + 1}`}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-border"
          >
            {year + 1}
          </Link>
        </div>
      </div>

      {!policy && previous && (
        <div className="bg-info/10 border border-border rounded-xl p-4 text-sm text-primary">
          No hay política definida para {year}. El formulario se ha
          pre-rellenado con los valores de {year - 1}. Revisa y guarda.
        </div>
      )}

      {!policy && !previous && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 text-sm text-warning">
          Esta sede aún no tiene política configurada. Define los días de
          vacaciones y asuntos propios que corresponden en {year}.
        </div>
      )}

      <PoliticasForm sedeId={id} year={year} initial={initial} />
    </div>
  );
}
