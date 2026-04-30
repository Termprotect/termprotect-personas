import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import {
  analyticsFiltersSchema,
  ANALYTICS_TABS,
  ANALYTICS_TAB_LABELS,
  type AnalyticsTab as AnalyticsTabKey,
} from "@/lib/validators/analytics";
import { buildEmployeeScope } from "@/lib/services/analytics/scope";

import { SectionHeader } from "@/components/ui/section-header";
import { UrlTabs, type UrlTabItem } from "@/components/ui/url-tabs";
import { AnalyticsFilters } from "@/components/analytics/analytics-filters";

import { OverviewTab } from "./_components/overview-tab";
import { WorkforceTab } from "./_components/workforce-tab";
import { LeavesTab } from "./_components/leaves-tab";
import { AlertsTab } from "./_components/alerts-tab";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function buildTabHref(currentParams: URLSearchParams, tab: AnalyticsTabKey): string {
  const next = new URLSearchParams(currentParams);
  next.set("tab", tab);
  return `/analytics?${next.toString()}`;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (!can.viewAnalytics(role)) {
    redirect("/inicio");
  }

  const sp = await searchParams;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) flat[k] = v[0] ?? "";
    else if (typeof v === "string") flat[k] = v;
  }
  const parsed = analyticsFiltersSchema.safeParse(flat);
  const filters = parsed.success
    ? parsed.data
    : analyticsFiltersSchema.parse({});

  const sedes = await db.sede.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const scope = buildEmployeeScope({
    role,
    userId: session.user.id,
    sedeId: filters.sedeId,
  });

  const baseParams = new URLSearchParams();
  if (filters.period) baseParams.set("period", filters.period);
  if (filters.sedeId) baseParams.set("sedeId", filters.sedeId);

  const tabs: UrlTabItem[] = ANALYTICS_TABS.map((tab) => ({
    value: tab,
    label: ANALYTICS_TAB_LABELS[tab],
    href: buildTabHref(baseParams, tab),
  }));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="People Analytics"
        description="Indicadores clave de gestión de personas"
      />

      <AnalyticsFilters
        sedes={sedes}
        current={{
          period: filters.period,
          sedeId: filters.sedeId,
          tab: filters.tab,
        }}
      />

      <UrlTabs tabs={tabs} activeValue={filters.tab} />

      <div className="pt-2">
        {filters.tab === "overview" ? (
          <OverviewTab scope={scope} filters={filters} />
        ) : null}
        {filters.tab === "workforce" ? (
          <WorkforceTab scope={scope} filters={filters} />
        ) : null}
        {filters.tab === "leaves" ? (
          <LeavesTab scope={scope} filters={filters} />
        ) : null}
        {filters.tab === "alerts" ? <AlertsTab scope={scope} /> : null}
      </div>
    </div>
  );
}
