import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Clock, CalendarDays, Bell, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function InicioPage() {
  const session = await auth();
  if (!session) return null;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Fichaje de hoy
  const todayEntry = await db.timeEntry.findFirst({
    where: {
      employeeId: session.user.id,
      date: new Date(todayStr),
    },
    orderBy: { clockIn: "desc" },
  });

  // Saldo de vacaciones del año actual
  const leaveBalance = await db.leaveBalance.findUnique({
    where: {
      employeeId_year: {
        employeeId: session.user.id,
        year: today.getFullYear(),
      },
    },
  });

  // Solicitudes pendientes (para managers/rrhh)
  const pendingLeaves =
    session.user.role === "MANAGER" || session.user.role === "RRHH" || session.user.role === "ADMIN"
      ? await db.leaveRequest.count({ where: { status: "PENDIENTE" } })
      : 0;

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Buenos días, {session.user.nombres}
        </h1>
        <p className="text-slate-500 text-sm mt-1 capitalize">
          {today.toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Fichaje de hoy */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <p className="font-semibold text-slate-700">Mi jornada hoy</p>
          </div>
          {todayEntry ? (
            <div className="space-y-1">
              <p className="text-sm text-slate-600">
                Entrada:{" "}
                <span className="font-medium text-slate-800">
                  {new Date(todayEntry.clockIn).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
              {todayEntry.clockOut ? (
                <p className="text-sm text-slate-600">
                  Salida:{" "}
                  <span className="font-medium text-slate-800">
                    {new Date(todayEntry.clockOut).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-emerald-600 font-medium">Jornada en curso</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No has fichado hoy</p>
          )}
          <Link
            href="/jornada/fichar"
            className="mt-4 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Ir a fichaje <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Saldo de vacaciones */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="font-semibold text-slate-700">Vacaciones {today.getFullYear()}</p>
          </div>
          {leaveBalance ? (
            <div className="space-y-1">
              <p className="text-sm text-slate-600">
                Disponibles:{" "}
                <span className="font-medium text-emerald-700">
                  {leaveBalance.totalDays - leaveBalance.usedDays - leaveBalance.pendingDays} días
                </span>
              </p>
              <p className="text-sm text-slate-600">
                Disfrutados:{" "}
                <span className="font-medium text-slate-800">{leaveBalance.usedDays} días</span>
              </p>
              {leaveBalance.pendingDays > 0 && (
                <p className="text-sm text-amber-600">
                  Pendientes de aprobar: {leaveBalance.pendingDays} días
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin saldo configurado</p>
          )}
          <Link
            href="/ausencias/mi-saldo"
            className="mt-4 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Ver detalle <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Solicitudes pendientes (solo managers y RRHH) */}
        {pendingLeaves > 0 && (
          <div className="bg-white rounded-xl border border-amber-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <p className="font-semibold text-slate-700">Pendientes de aprobar</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{pendingLeaves}</p>
            <p className="text-sm text-slate-500">solicitudes de ausencia</p>
            <Link
              href="/ausencias/aprobar"
              className="mt-4 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Revisar ahora <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Accesos rápidos */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Fichar entrada/salida", href: "/jornada/fichar", color: "blue" },
            { label: "Solicitar vacaciones", href: "/ausencias/solicitar", color: "emerald" },
            { label: "Mi jornada del mes", href: "/jornada/mi-jornada", color: "violet" },
            { label: "Mis evaluaciones", href: "/evaluaciones", color: "orange" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300
                         hover:shadow-sm transition-all text-center"
            >
              <p className="text-sm font-medium text-slate-700">{item.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
