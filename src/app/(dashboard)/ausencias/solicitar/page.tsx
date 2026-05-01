import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureLeaveBalance } from "@/lib/services/leave-balance";
import SolicitarForm from "./SolicitarForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const employee = await db.employee.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      sedeId: true,
      sede: { select: { name: true } },
    },
  });
  if (!employee) redirect("/login");

  const thisYear = new Date().getUTCFullYear();

  // Precargar saldos para el año actual y el siguiente (para previsualización)
  const balanceCurrent = await ensureLeaveBalance({
    employeeId: employee.id,
    sedeId: employee.sedeId,
    year: thisYear,
  });

  // Obtener festivos del rango actual + 2 años para el cálculo en cliente
  const from = new Date(Date.UTC(thisYear, 0, 1));
  const to = new Date(Date.UTC(thisYear + 1, 11, 31));
  const calendars = await db.sedeCalendar.findMany({
    where: {
      sedeId: employee.sedeId,
      date: { gte: from, lte: to },
    },
    select: { date: true },
  });

  const holidays = calendars.map((c) => c.date.toISOString().slice(0, 10));

  const balances = {
    [thisYear]: {
      vacationAvailable:
        balanceCurrent.totalDays -
        balanceCurrent.usedDays -
        balanceCurrent.pendingDays,
      personalAvailable:
        balanceCurrent.personalTotal -
        balanceCurrent.personalUsed -
        balanceCurrent.personalPending,
    },
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/ausencias"
          className="text-muted-foreground hover:text-muted-foreground text-sm"
        >
          ← Volver
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Nueva solicitud</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sede {employee.sede.name}
        </p>
      </div>

      <SolicitarForm holidays={holidays} balances={balances} />
    </div>
  );
}
