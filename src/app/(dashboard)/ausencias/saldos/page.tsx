import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import SaldosClient from "./SaldosClient";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; sede?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "RRHH"].includes(session.user.role)) redirect("/ausencias");

  const sp = await searchParams;
  const year = sp.year ? parseInt(sp.year, 10) : new Date().getUTCFullYear();
  const sedeFilter = sp.sede || "";

  const [employees, sedes, balances, policies] = await Promise.all([
    db.employee.findMany({
      where: {
        status: { in: ["ACTIVE", "BAJA_MEDICA", "EXCEDENCIA"] },
        ...(sedeFilter ? { sedeId: sedeFilter } : {}),
      },
      orderBy: [{ sedeId: "asc" }, { apellidos: "asc" }, { nombres: "asc" }],
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        status: true,
        sede: { select: { id: true, name: true } },
      },
    }),
    db.sede.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.leaveBalance.findMany({
      where: {
        year,
        ...(sedeFilter ? { sedeId: sedeFilter } : {}),
      },
      select: {
        employeeId: true,
        totalDays: true,
        usedDays: true,
        pendingDays: true,
        personalTotal: true,
        personalUsed: true,
        personalPending: true,
      },
    }),
    db.sedePolicy.findMany({
      where: { year },
      select: { sedeId: true, vacationDays: true, extraPersonalDays: true },
    }),
  ]);

  const balanceMap = new Map(balances.map((b) => [b.employeeId, b]));
  const policyMap = new Map(policies.map((p) => [p.sedeId, p]));

  const rows = employees.map((e) => {
    const b = balanceMap.get(e.id);
    const p = policyMap.get(e.sede.id);
    return {
      employeeId: e.id,
      nombres: e.nombres,
      apellidos: e.apellidos,
      status: e.status,
      sedeId: e.sede.id,
      sedeName: e.sede.name,
      hasBalance: !!b,
      totalDays: b?.totalDays ?? p?.vacationDays ?? 22,
      usedDays: b?.usedDays ?? 0,
      pendingDays: b?.pendingDays ?? 0,
      personalTotal: b?.personalTotal ?? p?.extraPersonalDays ?? 0,
      personalUsed: b?.personalUsed ?? 0,
      personalPending: b?.personalPending ?? 0,
    };
  });

  const thisYear = new Date().getUTCFullYear();
  const missingCount = rows.filter((r) => !r.hasBalance).length;

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

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Saldos anuales
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Año {year} · {rows.length} empleado(s)
            {missingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-warning/10 border border-warning/20 text-warning rounded-md text-xs font-semibold">
                {missingCount} sin inicializar
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center bg-background border border-border rounded-lg overflow-hidden">
            {[thisYear - 1, thisYear, thisYear + 1].map((y) => (
              <Link
                key={y}
                href={`/ausencias/saldos?year=${y}${sedeFilter ? `&sede=${sedeFilter}` : ""}`}
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
        </div>
      </div>

      <div className="bg-background rounded-xl border border-border p-4">
        <form className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="year" value={year} />
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

      <SaldosClient
        year={year}
        sedeId={sedeFilter || null}
        rows={rows}
      />
    </div>
  );
}
