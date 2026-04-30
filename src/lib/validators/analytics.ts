import { z } from "zod";

export const ANALYTICS_PERIODS = ["MTD", "LAST_30D", "YTD", "LAST_12M"] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export const ANALYTICS_PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  MTD: "Mes en curso",
  LAST_30D: "Últimos 30 días",
  YTD: "Año en curso",
  LAST_12M: "Últimos 12 meses",
};

export const ANALYTICS_TABS = ["overview", "workforce", "leaves", "alerts"] as const;
export type AnalyticsTab = (typeof ANALYTICS_TABS)[number];

export const ANALYTICS_TAB_LABELS: Record<AnalyticsTab, string> = {
  overview: "Resumen",
  workforce: "Plantilla",
  leaves: "Ausencias",
  alerts: "Alertas",
};

export const analyticsFiltersSchema = z.object({
  period: z.enum(ANALYTICS_PERIODS).default("MTD"),
  sedeId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  tab: z.enum(ANALYTICS_TABS).default("overview"),
});

export type AnalyticsFilters = z.infer<typeof analyticsFiltersSchema>;
