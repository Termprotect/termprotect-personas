import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getEvaluationsDashboard } from "@/lib/services/evaluations/dashboard";

import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { KpiCard } from "@/components/analytics/kpi-card";
import { Tag, type TagVariant } from "@/components/ui/tag";
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

const STATUS_CFG: Record<string, { label: string; variant: TagVariant }> = {
  BORRADOR: { label: "Borrador", variant: "neutral" },
  ACTIVO:   { label: "Activo",   variant: "good"    },
  CERRADO:  { label: "Cerrado",  variant: "info"    },
};

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function detectKind(name: string): { label: string; variant: TagVariant } {
  const upper = name.toUpperCase();
  if (upper.includes("ANNUAL") || upper.includes("ANUAL")) {
    return { label: "ANNUAL", variant: "info" };
  }
  if (upper.includes("MONTHLY") || upper.includes("MENSUAL")) {
    return { label: "MONTHLY_PEER", variant: "info" };
  }
  if (
    upper.includes("Q1") ||
    upper.includes("Q2") ||
    upper.includes("Q3") ||
    upper.includes("Q4") ||
    upper.includes("TRIM")
  ) {
    return { label: "QUARTERLY", variant: "info" };
  }
  return { label: "EVAL", variant: "neutral" };
}

export default async function EvaluacionesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const data = await getEvaluationsDashboard();

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <>
            Evaluaciones <em>de desempeño</em>
          </>
        }
        sub={`${data.activeCycles} ${data.activeCycles === 1 ? "ciclo activo" : "ciclos activos"} · ${data.totalEvaluations} evaluaciones registradas`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Ciclos activos"
          value={data.activeCycles}
          hint="ACTIVO o BORRADOR"
        />
        <KpiCard
          title="Evaluaciones totales"
          value={data.totalEvaluations}
          hint="Histórico"
        />
        <KpiCard
          title="Nota media"
          value={data.avgScore}
          format="score"
          delta={data.deltaScore !== null ? data.deltaScore * 10 : null}
          deltaLabel="vs año anterior"
          hint="Ciclos cerrados"
        />
        <KpiCard
          title="PIPs activos"
          value={data.activePips}
          hint="Planes de mejora en curso"
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Ciclos en curso y recientes</CardTitle>
            <CardDescription>
              Activos, borradores y últimos cerrados
            </CardDescription>
          </div>
        </CardHeader>
        {data.cyclesInProgress.length === 0 ? (
          <CardContent>
            <div className="text-[11px] font-mono uppercase tracking-[0.04em] text-ink-3 py-6 text-center">
              No hay ciclos definidos todavía
            </div>
          </CardContent>
        ) : (
          <Tbl containerClassName="border-0 shadow-none rounded-none border-t border-line">
            <TblHead>
              <TblHeadRow>
                <TblHeadCell>Ciclo</TblHeadCell>
                <TblHeadCell>Tipo</TblHeadCell>
                <TblHeadCell>Estado</TblHeadCell>
                <TblHeadCell right>Evaluados</TblHeadCell>
                <TblHeadCell>Progreso</TblHeadCell>
                <TblHeadCell>Cierre</TblHeadCell>
                <TblHeadCell right>Nota media</TblHeadCell>
              </TblHeadRow>
            </TblHead>
            <TblBody>
              {data.cyclesInProgress.map((c) => {
                const kind = detectKind(c.name);
                const statusCfg = STATUS_CFG[c.status] ?? {
                  label: c.status,
                  variant: "neutral" as TagVariant,
                };
                return (
                  <TblRow key={c.id}>
                    <TblCell>
                      <span className="font-medium text-ink">{c.name}</span>
                      <span className="block text-[10.5px] text-ink-3 font-mono mt-0.5">
                        {formatShortDate(c.startDate)} → {formatShortDate(c.endDate)}
                      </span>
                    </TblCell>
                    <TblCell>
                      <Tag variant={kind.variant}>{kind.label}</Tag>
                    </TblCell>
                    <TblCell>
                      <Tag variant={statusCfg.variant} dot>
                        {statusCfg.label}
                      </Tag>
                    </TblCell>
                    <TblCell mono right>
                      {c.evaluated}/{c.total}
                    </TblCell>
                    <TblCell>
                      <span className="flex items-center gap-2">
                        <span className="relative w-[180px] h-1 rounded-full bg-line overflow-hidden">
                          <span
                            className="absolute inset-y-0 left-0 bg-accent rounded-full"
                            style={{ width: `${c.progressPct}%` }}
                            aria-hidden
                          />
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-ink-2 w-10 text-right">
                          {c.progressPct}%
                        </span>
                      </span>
                    </TblCell>
                    <TblCell mono>{formatShortDate(c.endDate)}</TblCell>
                    <TblCell mono right>
                      <b className="text-ink font-medium">
                        {c.avgScore !== null ? c.avgScore.toFixed(1) : "—"}
                      </b>
                      <span className="text-ink-3 text-[10px] ml-0.5">/5</span>
                    </TblCell>
                  </TblRow>
                );
              })}
            </TblBody>
          </Tbl>
        )}
      </Card>
    </div>
  );
}
