import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Calendar, Settings2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function SedeDetailPage({
  params,
}: {
  params: Params;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RRHH") redirect("/inicio");

  const { id } = await params;
  const year = new Date().getFullYear();

  const sede = await db.sede.findUnique({
    where: { id },
    include: {
      policies: { orderBy: { year: "desc" }, take: 6 },
      _count: { select: { employees: true } },
    },
  });
  if (!sede) notFound();

  const current = sede.policies.find((p) => p.year === year) ?? null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link
          href="/configuracion"
          className="text-sm text-muted-foreground hover:text-muted-foreground"
        >
          ← Configuración
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{sede.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {sede._count.employees}{" "}
          {sede._count.employees === 1 ? "empleado" : "empleados"}
          {sede.convenioName && ` · Convenio: ${sede.convenioName}`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href={`/configuracion/sedes/${id}/festivos`}
          className="bg-background rounded-xl border border-border p-5 hover:border-border hover:shadow-sm transition-all flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Calendario laboral
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Festivos nacionales, autonómicos y locales.
            </p>
          </div>
        </Link>

        <Link
          href={`/configuracion/sedes/${id}/politicas`}
          className="bg-background rounded-xl border border-border p-5 hover:border-border hover:shadow-sm transition-all flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <Settings2 className="w-5 h-5 text-success" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Política anual
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Días de vacaciones y asuntos propios por año.
            </p>
          </div>
        </Link>
      </div>

      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Política actual ({year})
          </h2>
        </div>
        <div className="p-5">
          {current ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Vacaciones
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {current.vacationDays}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    días laborables
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Asuntos propios
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {current.extraPersonalDays}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    días extra
                  </span>
                </p>
              </div>
              {current.notes && (
                <div className="col-span-2 text-sm text-muted-foreground border-t border-border pt-3">
                  {current.notes}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-warning">
              No hay política definida para {year}. Configúrala en{" "}
              <Link
                href={`/configuracion/sedes/${id}/politicas`}
                className="font-medium underline"
              >
                Política anual
              </Link>
              .
            </p>
          )}
        </div>
      </div>

      {sede.policies.length > 1 && (
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Histórico de políticas
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Año
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Vacaciones
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Asuntos propios
                </th>
              </tr>
            </thead>
            <tbody>
              {sede.policies.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-2 font-medium text-foreground">
                    {p.year}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-foreground">
                    {p.vacationDays}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-foreground">
                    {p.extraPersonalDays}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
