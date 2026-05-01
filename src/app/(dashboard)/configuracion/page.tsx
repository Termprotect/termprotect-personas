import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RRHH") redirect("/inicio");

  const currentYear = new Date().getFullYear();

  const sedes = await db.sede.findMany({
    orderBy: { name: "asc" },
    include: {
      policies: {
        where: { year: currentYear },
        take: 1,
      },
      _count: {
        select: {
          employees: true,
          calendars: { where: { date: {
            gte: new Date(Date.UTC(currentYear, 0, 1)),
            lt: new Date(Date.UTC(currentYear + 1, 0, 1)),
          } } },
        },
      },
    },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Calendario laboral y políticas de vacaciones por sede. Configúralo
          cada año antes del periodo de solicitudes.
        </p>
      </div>

      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Sedes ({sedes.length})
          </h2>
        </div>
        <ul className="divide-y divide-border">
          {sedes.map((s) => {
            const policy = s.policies[0];
            const holidaysCount = s._count.calendars;
            const hasPolicy = !!policy;
            return (
              <li key={s.id}>
                <Link
                  href={`/configuracion/sedes/${s.id}`}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-secondary transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s._count.employees} empleados · {holidaysCount} festivos
                      en {currentYear}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasPolicy ? (
                      <span className="text-xs font-medium text-success bg-success/10 border border-success/20 px-2 py-1 rounded-full">
                        {currentYear} configurado
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-warning bg-warning/10 border border-warning/20 px-2 py-1 rounded-full">
                        Sin política {currentYear}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
