import Link from "next/link";
import Image from "next/image";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, User } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  currentMonth,
  formatDateShort,
  formatMinutes,
  formatTime,
  monthRange,
  workedMinutes,
} from "@/lib/time";
import JornadaTable from "./JornadaTable";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ month?: string }>;

export default async function EmpleadoJornadaPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  const canAccess = role === "ADMIN" || role === "RRHH" || role === "MANAGER";
  if (!canAccess) redirect("/jornada");

  const { id } = await params;
  const sp = await searchParams;
  const ym = sp.month ?? currentMonth();
  const { start, end, label, prev, next } = monthRange(ym);

  const employee = await db.employee.findUnique({
    where: { id },
    include: { sede: { select: { id: true, name: true } } },
  });
  if (!employee) notFound();

  // MANAGER solo puede ver sus reports
  if (role === "MANAGER" && employee.reportsToId !== session.user.id) {
    redirect("/jornada/empleados");
  }

  const canEdit = role === "ADMIN" || role === "RRHH" || role === "MANAGER";

  // Registro de auditoría (consulta de fichajes)
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "VIEW_TIME_ENTRIES",
      entityType: "Employee",
      entityId: employee.id,
      details: { month: ym },
    },
  });

  const [entries, holidays] = await Promise.all([
    db.timeEntry.findMany({
      where: {
        employeeId: employee.id,
        date: { gte: start, lt: end },
      },
      orderBy: { date: "asc" },
    }),
    db.sedeCalendar.findMany({
      where: {
        sedeId: employee.sedeId,
        date: { gte: start, lt: end },
      },
    }),
  ]);

  // Mapas auxiliares
  const entryByDate = new Map<string, (typeof entries)[number]>();
  for (const e of entries) entryByDate.set(toIso(e.date), e);

  const holidayByDate = new Map<string, (typeof holidays)[number]>();
  for (const h of holidays) holidayByDate.set(toIso(h.date), h);

  // Generar filas día a día del mes
  const rows = [];
  const now = new Date();
  for (
    const cursor = new Date(start);
    cursor < end;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const iso = toIso(cursor);
    const dow = cursor.getDay(); // 0 domingo, 6 sábado
    const isWeekend = dow === 0 || dow === 6;
    const holiday = holidayByDate.get(iso);
    const entry = entryByDate.get(iso);

    rows.push({
      id: entry?.id ?? null,
      dateIso: iso,
      dateLabel: formatDateShort(new Date(cursor)),
      clockIn: entry ? hhmm(entry.clockIn) : null,
      clockOut: entry?.clockOut ? hhmm(entry.clockOut) : null,
      breakMinutes: entry?.breakMinutes ?? 0,
      worked: entry ? workedMinutes(entry, now) : 0,
      source: (entry?.source ?? null) as "WEB" | "MANUAL" | "MOBILE" | null,
      isManual: entry?.isManual ?? false,
      manualReason: entry?.manualReason ?? null,
      notes: entry?.notes ?? null,
      isWeekend,
      isHoliday: !!holiday,
      holidayLabel: holiday?.description ?? null,
    });
  }

  // Totales
  const totals = entries.reduce(
    (acc, e) => {
      const worked = workedMinutes(e, now);
      if (e.clockOut) {
        acc.workedMinutes += worked;
        acc.daysWorked += 1;
      }
      acc.breakMinutes += e.breakMinutes;
      if (e.isManual) acc.manualCount += 1;
      return acc;
    },
    { workedMinutes: 0, breakMinutes: 0, daysWorked: 0, manualCount: 0 }
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Link
          href="/jornada/empleados"
          className="text-sm text-muted-foreground hover:text-muted-foreground"
        >
          ← Control de equipo
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
          {employee.photoUrl ? (
            <Image
              src={employee.photoUrl}
              alt={`${employee.nombres} ${employee.apellidos}`}
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {employee.apellidos}, {employee.nombres}
          </h1>
          <p className="text-muted-foreground text-sm">
            {employee.position ?? "—"} · {employee.sede.name}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Link
            href={`/jornada/empleados/${id}?month=${prev}`}
            className="inline-flex items-center gap-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-border"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Link>
          <span className="px-3 py-2 text-sm font-semibold text-foreground capitalize">
            {label}
          </span>
          <Link
            href={`/jornada/empleados/${id}?month=${next}`}
            className="inline-flex items-center gap-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-border"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={`/api/time-entries/export?employeeId=${employee.id}&month=${ym}`}
            className="inline-flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </a>
          <Link
            href={`/empleados/${employee.id}`}
            className="text-sm text-primary hover:text-accent"
          >
            Ver ficha →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TotalCard label="Días fichados" value={totals.daysWorked.toString()} />
        <TotalCard
          label="Total trabajado"
          value={formatMinutes(totals.workedMinutes)}
          emphasis
        />
        <TotalCard
          label="Total pausas"
          value={formatMinutes(totals.breakMinutes)}
        />
        <TotalCard
          label="Registros manuales"
          value={totals.manualCount.toString()}
        />
      </div>

      <JornadaTable employeeId={employee.id} rows={rows} canEdit={canEdit} />
    </div>
  );
}

function TotalCard({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </p>
      <p
        className={`tabular-nums mt-1 ${
          emphasis
            ? "text-2xl font-bold text-foreground"
            : "text-xl font-semibold text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hhmm(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return formatTime(date);
}
