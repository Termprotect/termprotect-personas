import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { LEAVE_TYPE_LABELS } from "@/lib/validators/leave-request";
import { Prisma } from "@prisma/client";
import { CheckCircle2, Clock, ListFilter } from "lucide-react";
import AprobacionesList from "./AprobacionesList";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string; estado?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (!["ADMIN", "RRHH", "MANAGER"].includes(role)) {
    redirect("/ausencias");
  }

  const sp = await searchParams;
  const sedeFilter = sp.sede || "";
  const estadoFilter = (sp.estado as "PENDIENTE" | "TODAS" | undefined) ?? "PENDIENTE";

  // Scope por rol
  const whereBase: Prisma.LeaveRequestWhereInput = {};
  if (role === "MANAGER") {
    whereBase.employee = { reportsToId: session.user.id };
  }
  if (sedeFilter) {
    whereBase.employee = { ...(whereBase.employee ?? {}), sedeId: sedeFilter };
  }
  if (estadoFilter === "PENDIENTE") {
    whereBase.status = "PENDIENTE";
  }

  const [requests, sedes, pendientesCount] = await Promise.all([
    db.leaveRequest.findMany({
      where: whereBase,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        totalDays: true,
        status: true,
        notes: true,
        attachmentUrl: true,
        rejectedReason: true,
        createdAt: true,
        employee: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            photoUrl: true,
            sede: { select: { id: true, name: true } },
          },
        },
      },
    }),
    role === "MANAGER"
      ? Promise.resolve(
          await db.sede.findMany({
            where: {
              employees: { some: { reportsToId: session.user.id } },
            },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        )
      : db.sede.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
    db.leaveRequest.count({
      where: {
        ...(role === "MANAGER"
          ? { employee: { reportsToId: session.user.id } }
          : {}),
        status: "PENDIENTE",
      },
    }),
  ]);

  // Pre-cargar saldos del año de cada solicitud
  const balanceKeys = Array.from(
    new Set(
      requests.map(
        (r) => `${r.employee.id}-${r.startDate.getUTCFullYear()}`
      )
    )
  );
  const balances = await db.leaveBalance.findMany({
    where: {
      OR: balanceKeys.map((k) => {
        const [employeeId, yearStr] = k.split("-");
        return { employeeId, year: parseInt(yearStr, 10) };
      }),
    },
    select: {
      employeeId: true,
      year: true,
      totalDays: true,
      usedDays: true,
      pendingDays: true,
      personalTotal: true,
      personalUsed: true,
      personalPending: true,
    },
  });
  const balanceMap = new Map(
    balances.map((b) => [`${b.employeeId}-${b.year}`, b])
  );

  const items = requests.map((r) => {
    const b = balanceMap.get(`${r.employee.id}-${r.startDate.getUTCFullYear()}`);
    return {
      id: r.id,
      type: r.type,
      typeLabel: LEAVE_TYPE_LABELS[r.type] ?? r.type,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
      totalDays: r.totalDays,
      status: r.status,
      notes: r.notes,
      rejectedReason: r.rejectedReason,
      hasAttachment: !!r.attachmentUrl,
      createdAt: r.createdAt.toISOString(),
      employee: {
        id: r.employee.id,
        nombres: r.employee.nombres,
        apellidos: r.employee.apellidos,
        photoUrl: r.employee.photoUrl,
        sedeName: r.employee.sede.name,
      },
      balance: b
        ? {
            year: b.year,
            vacationAvailable: b.totalDays - b.usedDays - b.pendingDays,
            personalAvailable: b.personalTotal - b.personalUsed - b.personalPending,
          }
        : null,
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/ausencias" className="text-muted-foreground hover:text-muted-foreground text-sm">
          ← Volver
        </Link>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aprobaciones</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {role === "MANAGER"
              ? "Solicitudes de tu equipo directo"
              : "Solicitudes de toda la organización"}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-warning/10 text-warning border border-warning/20 rounded-lg text-sm">
          <Clock className="w-4 h-4" />
          {pendientesCount} pendiente(s)
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-background rounded-xl border border-border p-4">
        <form className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <ListFilter className="w-3 h-3" />
              Estado
            </label>
            <select
              name="estado"
              defaultValue={estadoFilter}
              className="px-3 py-1.5 border border-border rounded-lg text-sm"
            >
              <option value="PENDIENTE">Solo pendientes</option>
              <option value="TODAS">Todas</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Sede
            </label>
            <select
              name="sede"
              defaultValue={sedeFilter}
              className="px-3 py-1.5 border border-border rounded-lg text-sm min-w-[160px]"
            >
              <option value="">Todas</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg"
          >
            Filtrar
          </button>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Solicitudes ({items.length})
          </h2>
        </div>
        {items.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3" />
            <p className="text-muted-foreground text-sm font-medium">
              No hay solicitudes en este filtro
            </p>
          </div>
        ) : (
          <AprobacionesList items={items} canActOn={role} />
        )}
      </div>
    </div>
  );
}
