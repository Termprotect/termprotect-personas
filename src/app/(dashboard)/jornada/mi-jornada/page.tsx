import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Pencil } from "lucide-react";
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

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string }>;

export default async function MiJornadaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const ym = sp.month ?? currentMonth();
  const { start, end, label, prev, next } = monthRange(ym);

  const entries = await db.timeEntry.findMany({
    where: {
      employeeId: session.user.id,
      date: { gte: start, lt: end },
    },
    orderBy: { date: "asc" },
  });

  // Totales del mes
  const totals = entries.reduce(
    (acc, e) => {
      const worked = workedMinutes(e, new Date());
      acc.workedMinutes += e.clockOut ? worked : 0; // solo computamos días cerrados
      acc.breakMinutes += e.breakMinutes;
      if (e.clockOut) acc.daysWorked += 1;
      if (e.source === "MANUAL") acc.manualCount += 1;
      return acc;
    },
    { workedMinutes: 0, breakMinutes: 0, daysWorked: 0, manualCount: 0 }
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <Link
          href="/jornada"
          className="text-muted-foreground hover:text-muted-foreground text-sm"
        >
          ← Volver
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mi historial</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Fichajes del mes. Los días marcados como <em>manual</em> fueron
            registrados por RRHH o tu responsable.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/jornada/mi-jornada?month=${prev}`}
            className="inline-flex items-center gap-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-border transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Link>
          <span className="px-3 py-2 text-sm font-semibold text-foreground capitalize">
            {label}
          </span>
          <Link
            href={`/jornada/mi-jornada?month=${next}`}
            className="inline-flex items-center gap-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-border transition-colors"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </Link>
          <a
            href={`/api/time-entries/export?employeeId=${session.user.id}&month=${ym}`}
            className="inline-flex items-center gap-1 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors ml-2"
          >
            <Download className="w-4 h-4" />
            PDF
          </a>
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

      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {entries.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-muted-foreground font-medium">Sin fichajes este mes</p>
            <p className="text-muted-foreground text-sm mt-1">
              No hay registros de jornada para {label}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <Th>Fecha</Th>
                  <Th>Entrada</Th>
                  <Th>Salida</Th>
                  <Th className="text-right">Pausa</Th>
                  <Th className="text-right">Trabajado</Th>
                  <Th>Origen</Th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const worked = workedMinutes(e, new Date());
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/50"
                    >
                      <Td className="font-medium text-foreground capitalize">
                        {formatDateShort(e.date)}
                      </Td>
                      <Td className="tabular-nums">
                        {formatTime(e.clockIn)}
                      </Td>
                      <Td className="tabular-nums">
                        {e.clockOut ? formatTime(e.clockOut) : (
                          <span className="text-warning text-xs font-medium">
                            Abierto
                          </span>
                        )}
                      </Td>
                      <Td className="text-right tabular-nums text-muted-foreground">
                        {e.breakMinutes > 0 ? formatMinutes(e.breakMinutes) : "—"}
                      </Td>
                      <Td className="text-right tabular-nums font-semibold text-foreground">
                        {e.clockOut ? formatMinutes(worked) : "—"}
                      </Td>
                      <Td>
                        <OriginBadge source={e.source} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 text-foreground ${className}`}>{children}</td>;
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

function OriginBadge({ source }: { source: string }) {
  if (source === "MANUAL") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 border border-warning/20 text-warning text-xs font-medium">
        <Pencil className="w-3 h-3" />
        Manual
      </span>
    );
  }
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
      Web
    </span>
  );
}
