import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfDay } from "@/lib/time";
import FichajeWidget from "./FichajeWidget";

export const dynamic = "force-dynamic";

export default async function JornadaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const today = startOfDay();
  const entry = await db.timeEntry.findUnique({
    where: {
      employeeId_date: {
        employeeId: session.user.id,
        date: today,
      },
    },
  });

  const role = session.user.role;
  const canSeeTeam = role === "ADMIN" || role === "RRHH" || role === "MANAGER";

  // Serializar Date → string para el client component
  const initialEntry = entry
    ? {
        id: entry.id,
        clockIn: entry.clockIn.toISOString(),
        clockOut: entry.clockOut ? entry.clockOut.toISOString() : null,
        breakMinutes: entry.breakMinutes,
        breakStartedAt: entry.breakStartedAt
          ? entry.breakStartedAt.toISOString()
          : null,
      }
    : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Control de jornada</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ficha tu entrada, pausa y salida. Los registros quedan guardados conforme
          a la Ley de Registro de Jornada.
        </p>
      </div>

      <FichajeWidget initialEntry={initialEntry} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/jornada/mi-jornada"
          className="bg-background rounded-xl border border-border p-5 hover:border-border hover:shadow-sm transition-all flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Mi historial</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consulta tus fichajes y totales por mes.
            </p>
          </div>
        </Link>

        {canSeeTeam && (
          <Link
            href="/jornada/empleados"
            className="bg-background rounded-xl border border-border p-5 hover:border-border hover:shadow-sm transition-all flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Control de equipo
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fichajes de la plantilla, correcciones manuales y exportación.
              </p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
