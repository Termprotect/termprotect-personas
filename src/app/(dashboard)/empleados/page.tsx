import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import EmpleadosFilters from "./EmpleadosFilters";
import StatusBadge from "./StatusBadge";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { MiniKpiStrip } from "@/components/ui/mini-kpi";
import { MiniCard } from "@/components/analytics/mini-card";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import {
  Tbl,
  TblBody,
  TblCell,
  TblHead,
  TblHeadCell,
  TblHeadRow,
  TblRow,
} from "@/components/ui/tbl";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  RRHH: "RRHH",
  MANAGER: "Manager",
  EMPLEADO: "Empleado",
};

function avgYears(startDates: (Date | null)[], now: Date): number | null {
  const ms = startDates.reduce((acc, d) => {
    if (!d) return acc;
    return acc + (now.getTime() - d.getTime());
  }, 0);
  const n = startDates.filter((d) => d !== null).length;
  if (n === 0) return null;
  return Math.round((ms / n / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10;
}

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

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    sedes,
    total,
    employees,
    countActivos,
    countIT,
    countPrueba,
    countIndefinidos,
    activeStartDates,
    departmentsDistinct,
  ] = await Promise.all([
    db.sede.findMany({ orderBy: { name: "asc" } }),
    db.employee.count({ where }),
    db.employee.findMany({
      where,
      include: { sede: { select: { name: true } } },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.employee.count({ where: { status: "ACTIVE" } }),
    db.employee.count({ where: { status: "BAJA_MEDICA" } }),
    db.employee.count({
      where: { status: "ACTIVE", trialEndDate: { gte: now, lte: in30 } },
    }),
    db.employee.count({ where: { status: "ACTIVE", contractType: "INDEFINIDO" } }),
    db.employee.findMany({
      where: { status: "ACTIVE", startDate: { not: null } },
      select: { startDate: true },
    }),
    db.employee.findMany({
      where: { status: "ACTIVE", department: { not: null } },
      select: { department: true },
      distinct: ["department"],
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const antiguedadMedia = avgYears(
    activeStartDates.map((e) => e.startDate),
    now,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Empleados"
        sub={`${total} ${total === 1 ? "resultado" : "resultados"} · ${sedes.length} sedes · ${departmentsDistinct.length} departamentos`}
        actions={
          canCreate ? (
            <Button asChild variant="primary">
              <Link href="/empleados/nuevo">
                <Plus className="w-3.5 h-3.5" /> Nuevo
              </Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <MiniKpiStrip cols={5}>
          <MiniCard label="Activos" value={countActivos} meta="Plantilla actual" />
          <MiniCard label="En IT" value={countIT} meta="Baja médica activa" />
          <MiniCard
            label="Período prueba"
            value={countPrueba}
            meta="Vencen en 30d"
          />
          <MiniCard
            label="Indefinidos"
            value={countIndefinidos}
            meta="Contrato fijo"
          />
          <MiniCard
            label="Antig. media"
            value={antiguedadMedia !== null ? `${antiguedadMedia}` : "—"}
            meta="años en activos"
          />
        </MiniKpiStrip>
      </Card>

      <EmpleadosFilters sedes={sedes} />

      <Card className="overflow-hidden">
        {employees.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-ink font-medium text-[14px]">Sin resultados</p>
            <p className="text-ink-3 text-[12px] mt-1">
              Ajusta los filtros o crea un nuevo empleado.
            </p>
          </div>
        ) : (
          <Tbl containerClassName="border-0 shadow-none rounded-none">
            <TblHead>
              <TblHeadRow>
                <TblHeadCell>Empleado</TblHeadCell>
                <TblHeadCell>Documento</TblHeadCell>
                <TblHeadCell>Sede</TblHeadCell>
                <TblHeadCell>Cargo</TblHeadCell>
                <TblHeadCell>Rol</TblHeadCell>
                <TblHeadCell>Estado</TblHeadCell>
              </TblHeadRow>
            </TblHead>
            <TblBody>
              {employees.map((e) => {
                const fullName = `${e.apellidos}, ${e.nombres}`;
                return (
                  <TblRow key={e.id} interactive>
                    <TblCell className="py-2">
                      <Link
                        href={`/empleados/${e.id}`}
                        className="flex items-center gap-2.5 group"
                      >
                        {e.photoUrl ? (
                          <span className="inline-block w-7 h-7 rounded-full overflow-hidden bg-line-2 shrink-0">
                            <Image
                              src={e.photoUrl}
                              alt={fullName}
                              width={28}
                              height={28}
                              className="w-full h-full object-cover"
                            />
                          </span>
                        ) : (
                          <Avatar name={`${e.nombres} ${e.apellidos}`} size="lg" />
                        )}
                        <span className="flex flex-col min-w-0">
                          <span className="text-[13px] font-medium text-ink group-hover:text-accent transition-colors truncate">
                            {fullName}
                          </span>
                          {e.email ? (
                            <span className="text-[11px] text-ink-3 font-mono truncate">
                              {e.email}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </TblCell>
                    <TblCell idCell>
                      {e.documentNumber}
                      <span className="block text-[10px] text-ink-4">
                        {e.documentType}
                      </span>
                    </TblCell>
                    <TblCell>
                      <Tag>{e.sede.name.slice(0, 3).toUpperCase()}</Tag>
                    </TblCell>
                    <TblCell>
                      {e.position ?? <span className="text-ink-4">—</span>}
                    </TblCell>
                    <TblCell className="text-ink-2">
                      {ROLE_LABEL[e.role] ?? e.role}
                    </TblCell>
                    <TblCell>
                      <StatusBadge status={e.status} />
                    </TblCell>
                  </TblRow>
                );
              })}
            </TblBody>
          </Tbl>
        )}
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-[12px]">
          <p className="text-ink-3 font-mono uppercase tracking-[0.04em]">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="default" size="sm">
                <Link href={buildHref(sp, page - 1)}>Anterior</Link>
              </Button>
            ) : null}
            {page < totalPages ? (
              <Button asChild variant="default" size="sm">
                <Link href={buildHref(sp, page + 1)}>Siguiente</Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
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
