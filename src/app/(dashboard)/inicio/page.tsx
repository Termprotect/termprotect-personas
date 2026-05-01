import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { buildEmployeeScope } from "@/lib/services/analytics/scope";
import { getRecentActivity } from "@/lib/services/analytics/activity";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { ActivityFeed } from "@/components/analytics/activity-feed";
import { MyJourneyCard } from "@/components/inicio/my-journey-card";

export const dynamic = "force-dynamic";

const MONTH_LABELS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const DAY_LABELS_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

function getGreeting(date: Date): string {
  const h = date.getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 21) return "Buenas tardes";
  return "Buenas noches";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface HoyTile {
  label: string;
  value: number;
  variant: "good" | "warn" | "bad" | "info";
  href: string;
  hint: string;
}

export default async function InicioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const role = session.user.role;
  const firstName = (session.user.nombres ?? "").split(/\s+/)[0] || "Usuario";

  const now = new Date();
  const greeting = getGreeting(now);
  const dateLabel = `${capitalize(DAY_LABELS_ES[now.getDay()])} · ${now.getDate()} de ${MONTH_LABELS_ES[now.getMonth()]} ${now.getFullYear()}`;

  const isManagerOrUp = can.viewTeamLeave(role);

  const scope = isManagerOrUp
    ? buildEmployeeScope({ role, userId, sedeId: undefined })
    : undefined;

  const [
    pendingApprovals,
    docsExpiringMine,
    contractsToRenewSoon,
    pipsActiveMine,
    activity,
  ] = await Promise.all([
    isManagerOrUp
      ? db.leaveRequest.count({
          where: { status: "PENDIENTE", employee: scope },
        })
      : Promise.resolve(0),
    db.employeeDocument.count({
      where: {
        employeeId: userId,
        expiresAt: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    isManagerOrUp
      ? db.employee.count({
          where: {
            ...(scope ?? {}),
            contractType: "TEMPORAL",
            endDate: {
              gte: now,
              lte: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
            },
          },
        })
      : Promise.resolve(0),
    db.improvementPlan.count({
      where: { status: "ACTIVO", evaluation: { employeeId: userId } },
    }),
    isManagerOrUp
      ? getRecentActivity(scope!, 12)
      : Promise.resolve({
          items: [] as Awaited<ReturnType<typeof getRecentActivity>>["items"],
        }),
  ]);

  const tiles: HoyTile[] = [];
  if (isManagerOrUp) {
    tiles.push({
      label: "Aprobaciones pdtes",
      value: pendingApprovals,
      variant: pendingApprovals > 0 ? "warn" : "good",
      href: "/ausencias",
      hint: "Solicitudes por revisar",
    });
    tiles.push({
      label: "Contratos a renovar",
      value: contractsToRenewSoon,
      variant: contractsToRenewSoon > 0 ? "info" : "good",
      href: "/empleados?estado=ACTIVE",
      hint: "Próximos 60 días",
    });
  }
  tiles.push({
    label: "Mis docs por vencer",
    value: docsExpiringMine,
    variant: docsExpiringMine > 0 ? "warn" : "good",
    href: "/empleados/" + userId,
    hint: "Próximos 30 días",
  });
  tiles.push({
    label: "PIPs activos",
    value: pipsActiveMine,
    variant: pipsActiveMine > 0 ? "bad" : "good",
    href: "/evaluaciones",
    hint: "Mis planes de mejora",
  });

  const attentionCount = tiles.filter(
    (t) => t.value > 0 && t.variant !== "good",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <>
            {greeting}, <em>{firstName}</em>
          </>
        }
        sub={
          attentionCount > 0
            ? `${dateLabel} · ${attentionCount} ${attentionCount === 1 ? "cosa necesita" : "cosas necesitan"} tu atención hoy`
            : `${dateLabel} · todo al día`
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8">
          <CardHeader>
            <div className="flex items-baseline gap-2">
              <CardTitle>Hoy</CardTitle>
              <Tag variant="good" dot>
                EN VIVO
              </Tag>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tiles.map((t) => (
              <Link
                key={t.label}
                href={t.href}
                className="rounded-lg border border-line-2 bg-surface-2 hover:bg-bg-2 hover:border-line-3 transition-colors p-3 flex flex-col gap-1.5 min-h-[110px]"
              >
                <div className="text-[10.5px] font-mono uppercase tracking-[0.04em] text-ink-3">
                  {t.label}
                </div>
                <div
                  className={`font-mono text-[28px] font-medium leading-none tabular-nums tracking-[-0.02em] ${
                    t.variant === "good"
                      ? "text-good"
                      : t.variant === "warn"
                        ? "text-warn"
                        : t.variant === "bad"
                          ? "text-bad"
                          : "text-accent"
                  }`}
                >
                  {t.value}
                </div>
                <div className="text-[10.5px] text-ink-3 mt-auto flex items-center justify-between">
                  <span>{t.hint}</span>
                  <span className="font-mono text-ink-2">Revisar →</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="lg:col-span-4">
          <MyJourneyCard />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
          <span className="text-[10.5px] font-mono uppercase tracking-[0.04em] text-ink-3">
            últimas acciones
          </span>
        </CardHeader>
        <CardContent className="pt-0">
          <ActivityFeed
            items={activity.items}
            emptyHint={
              isManagerOrUp
                ? "Sin actividad reciente"
                : "Solo Manager+ ven actividad del equipo"
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
