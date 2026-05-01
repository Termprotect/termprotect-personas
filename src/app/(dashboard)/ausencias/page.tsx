import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureLeaveBalance } from "@/lib/services/leave-balance";
import { LEAVE_TYPE_LABELS } from "@/lib/validators/leave-request";
import {
  Plus,
  Plane,
  Briefcase,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle,
  Inbox,
  CalendarDays,
  Scale,
} from "lucide-react";
import MisSolicitudesTable from "./MisSolicitudesTable";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const year = sp.year ? parseInt(sp.year, 10) : new Date().getUTCFullYear();

  const employee = await db.employee.findUnique({
    where: { id: session.user.id },
    select: { id: true, sedeId: true, sede: { select: { name: true } } },
  });
  if (!employee) redirect("/login");

  const balance = await ensureLeaveBalance({
    employeeId: employee.id,
    sedeId: employee.sedeId,
    year,
  });

  const vacAvailable =
    balance.totalDays - balance.usedDays - balance.pendingDays;
  const perAvailable =
    balance.personalTotal - balance.personalUsed - balance.personalPending;

  const yStart = new Date(Date.UTC(year, 0, 1));
  const yEnd = new Date(Date.UTC(year, 11, 31));

  const requests = await db.leaveRequest.findMany({
    where: {
      employeeId: employee.id,
      startDate: { lte: yEnd },
      endDate: { gte: yStart },
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      type: true,
      startDate: true,
      endDate: true,
      totalDays: true,
      status: true,
      notes: true,
      rejectedReason: true,
      attachmentUrl: true,
      createdAt: true,
    },
  });

  const itemsForClient = requests.map((r) => ({
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
  }));

  const thisYear = new Date().getUTCFullYear();
  const role = session.user.role;
  const canApprove = ["ADMIN", "RRHH", "MANAGER"].includes(role);
  const canManageBalances = ["ADMIN", "RRHH"].includes(role);
  let pendingCount = 0;
  if (canApprove) {
    pendingCount = await db.leaveRequest.count({
      where: {
        status: "PENDIENTE",
        ...(role === "MANAGER"
          ? { employee: { reportsToId: session.user.id } }
          : {}),
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Vacaciones y Ausencias
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sede {employee.sede.name} · Año {year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Selector de año */}
          <div className="inline-flex items-center bg-background border border-border rounded-lg overflow-hidden">
            {[thisYear - 1, thisYear, thisYear + 1].map((y) => (
              <Link
                key={y}
                href={`/ausencias?year=${y}`}
                className={`px-3 py-1.5 text-sm ${
                  y === year
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
          {canApprove && (
            <>
              <Link
                href="/ausencias/calendario"
                className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border hover:bg-secondary text-foreground text-sm font-medium rounded-lg"
              >
                <CalendarDays className="w-4 h-4" />
                Calendario
              </Link>
              <Link
                href="/ausencias/aprobar"
                className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border hover:bg-secondary text-foreground text-sm font-medium rounded-lg relative"
              >
                <Inbox className="w-4 h-4" />
                Aprobaciones
                {pendingCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-warning text-white text-[10px] font-bold rounded-full">
                    {pendingCount}
                  </span>
                )}
              </Link>
            </>
          )}
          {canManageBalances && (
            <Link
              href="/ausencias/saldos"
              className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border hover:bg-secondary text-foreground text-sm font-medium rounded-lg"
            >
              <Scale className="w-4 h-4" />
              Saldos
            </Link>
          )}
          <Link
            href="/ausencias/solicitar"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Nueva solicitud
          </Link>
        </div>
      </div>

      {/* Tarjetas de saldo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BalanceCard
          title="Vacaciones"
          icon={<Plane className="w-5 h-5 text-accent" />}
          total={balance.totalDays}
          used={balance.usedDays}
          pending={balance.pendingDays}
          available={vacAvailable}
          accent="blue"
        />
        <BalanceCard
          title="Asuntos propios"
          icon={<Briefcase className="w-5 h-5 text-success" />}
          total={balance.personalTotal}
          used={balance.personalUsed}
          pending={balance.personalPending}
          available={perAvailable}
          accent="violet"
          emptyLabel={
            balance.personalTotal === 0
              ? "Tu sede no tiene días extra asignados"
              : undefined
          }
        />
      </div>

      {/* Listado */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Mis solicitudes ({requests.length})
          </h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm font-medium">
              No tienes solicitudes en {year}
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Usa el botón "Nueva solicitud" para crear una.
            </p>
          </div>
        ) : (
          <MisSolicitudesTable items={itemsForClient} />
        )}
      </div>

      {/* Aviso legal */}
      <div className="flex items-start gap-2 p-3 bg-secondary border border-border rounded-lg text-muted-foreground text-xs">
        <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <span>
          Los días de vacaciones se computan en días laborables (L-V)
          descontando los festivos de tu sede. La solicitud queda pendiente
          hasta la aprobación de tu responsable o RRHH.
        </span>
      </div>
    </div>
  );
}

function BalanceCard({
  title,
  icon,
  total,
  used,
  pending,
  available,
  accent,
  emptyLabel,
}: {
  title: string;
  icon: React.ReactNode;
  total: number;
  used: number;
  pending: number;
  available: number;
  accent: "blue" | "violet";
  emptyLabel?: string;
}) {
  // accent="blue" → vacaciones (dorado, marca premium)
  // accent="violet" → asuntos propios (verde success, diferenciación clara)
  const accentBg = accent === "blue" ? "bg-accent/10" : "bg-success/10";
  const accentText = accent === "blue" ? "text-accent" : "text-success";
  const barColor = accent === "blue" ? "bg-accent" : "bg-success";
  const pct = total > 0 ? ((used + pending) / total) * 100 : 0;

  return (
    <div className="bg-background rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 ${accentBg} rounded-lg flex items-center justify-center`}>
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-lg font-bold text-foreground">
              {available} <span className="text-sm font-normal text-muted-foreground">/ {total} días</span>
            </p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-md text-xs font-semibold ${accentBg} ${accentText}`}>
          Disponibles
        </div>
      </div>

      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className={`h-full ${barColor}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[11px] text-muted-foreground">Usados</p>
          <p className="text-sm font-semibold text-foreground flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-success" />
            {used}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Pendientes</p>
          <p className="text-sm font-semibold text-foreground flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-warning" />
            {pending}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Disponibles</p>
          <p className={`text-sm font-semibold ${accentText}`}>
            {available}
          </p>
        </div>
      </div>

      {emptyLabel && (
        <p className="text-[11px] text-muted-foreground mt-3 text-center">
          {emptyLabel}
        </p>
      )}
    </div>
  );
}

