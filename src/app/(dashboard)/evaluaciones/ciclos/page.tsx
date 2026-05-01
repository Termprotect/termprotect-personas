import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  EVAL_CYCLE_STATUS_LABELS,
} from "@/lib/validators/evaluation";
import CiclosClient from "./CiclosClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "RRHH"].includes(session.user.role)) redirect("/evaluaciones");

  const cycles = await db.evalCycle.findMany({
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { evaluations: true } } },
  });

  const statusCounts = await db.evaluation.groupBy({
    by: ["cycleId", "status"],
    _count: { _all: true },
  });
  const byCycle = new Map<string, Record<string, number>>();
  for (const c of statusCounts) {
    if (!byCycle.has(c.cycleId)) byCycle.set(c.cycleId, {});
    byCycle.get(c.cycleId)![c.status] = c._count._all;
  }

  const items = cycles.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    startDate: c.startDate.toISOString().slice(0, 10),
    endDate: c.endDate.toISOString().slice(0, 10),
    status: c.status,
    total: c._count.evaluations,
    byStatus: byCycle.get(c.id) ?? {},
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/evaluaciones"
          className="text-muted-foreground hover:text-muted-foreground text-sm"
        >
          ← Volver
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ciclos de evaluación</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Crea ciclos, genera evaluaciones por empleado y activa/cierra el proceso.
        </p>
      </div>

      <CiclosClient
        initial={items}
        labels={EVAL_CYCLE_STATUS_LABELS}
      />
    </div>
  );
}
