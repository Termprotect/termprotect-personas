import Link from "next/link";
import Image from "next/image";
import { Plus, User } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import EmpleadosFilters from "./EmpleadosFilters";
import StatusBadge from "./StatusBadge";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const roleLabel: Record<string, string> = {
  ADMIN: "Administrador",
  RRHH: "RRHH",
  MANAGER: "Manager",
  EMPLEADO: "Empleado",
};

export default async function EmpleadosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sede?: string;
    estado?: string;
    rol?: string;
    page?: string;
  }>;
}) {
  const session = await auth();
  const canCreate = session?.user.role === "ADMIN" || session?.user.role === "RRHH";

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const sedeFilter = sp.sede ?? "";
  const estadoFilter = sp.estado ?? "";
  const rolFilter = sp.rol ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.EmployeeWhereInput = {};
  if (q) {
    where.OR = [
      { nombres: { contains: q, mode: "insensitive" } },
      { apellidos: { contains: q, mode: "insensitive" } },
      { documentNumber: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (sedeFilter) where.sedeId = sedeFilter;
  if (estadoFilter) where.status = estadoFilter as Prisma.EmployeeWhereInput["status"];
  if (rolFilter) where.role = rolFilter as Prisma.EmployeeWhereInput["role"];

  const [sedes, total, employees] = await Promise.all([
    db.sede.findMany({ orderBy: { name: "asc" } }),
    db.employee.count({ where }),
    db.employee.findMany({
      where,
      include: { sede: { select: { name: true } } },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empleados</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} {total === 1 ? "empleado" : "empleados"} en total
          </p>
        </div>
        {canCreate && (
          <Link
            href="/empleados/nuevo"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo empleado
          </Link>
        )}
      </div>

      <EmpleadosFilters sedes={sedes} />

      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {employees.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground font-medium">Sin resultados</p>
            <p className="text-muted-foreground text-sm mt-1">
              Ajusta los filtros o crea un nuevo empleado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-border">
                <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Empleado</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Sede</th>
                  <th className="px-4 py-3 font-medium">Cargo</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((e) => (
                  <tr key={e.id} className="hover:bg-secondary transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/empleados/${e.id}`} className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
                          {e.photoUrl ? (
                            <Image
                              src={e.photoUrl}
                              alt={`${e.nombres} ${e.apellidos}`}
                              width={36}
                              height={36}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground group-hover:text-accent transition-colors">
                            {e.apellidos}, {e.nombres}
                          </p>
                          {e.email && (
                            <p className="text-xs text-muted-foreground">{e.email}</p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="font-mono text-xs">{e.documentNumber}</span>
                      <p className="text-xs text-muted-foreground">{e.documentType}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{e.sede.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.position ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{roleLabel[e.role] ?? e.role}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildHref(sp, page - 1)}
                className="px-3 py-1.5 border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildHref(sp, page + 1)}
                className="px-3 py-1.5 border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function buildHref(sp: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  if (sp.q) params.set("q", sp.q);
  if (sp.sede) params.set("sede", sp.sede);
  if (sp.estado) params.set("estado", sp.estado);
  if (sp.rol) params.set("rol", sp.rol);
  params.set("page", String(page));
  return `/empleados?${params.toString()}`;
}
