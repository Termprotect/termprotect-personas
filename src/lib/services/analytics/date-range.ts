import type { AnalyticsPeriod } from "@/lib/validators/analytics";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface MonthBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

const MONTH_LABELS_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

export function startOfMonth(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), 1);
  return startOfDay(r);
}

export function endOfMonth(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return endOfDay(r);
}

export function startOfYear(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), 0, 1));
}

export function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function getMonthRange(d: Date = new Date()): DateRange {
  return { from: startOfMonth(d), to: endOfMonth(d) };
}

export function rangeForPeriod(period: AnalyticsPeriod, now: Date = new Date()): DateRange {
  switch (period) {
    case "MTD":
      return { from: startOfMonth(now), to: endOfDay(now) };
    case "LAST_30D":
      return { from: startOfDay(addDays(now, -30)), to: endOfDay(now) };
    case "YTD":
      return { from: startOfYear(now), to: endOfDay(now) };
    case "LAST_12M":
      return { from: startOfDay(addMonths(now, -12)), to: endOfDay(now) };
  }
}

export function getLast12MonthsBuckets(now: Date = new Date()): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const ref = addMonths(now, -i);
    const start = startOfMonth(ref);
    const end = endOfMonth(ref);
    buckets.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTH_LABELS_ES[start.getMonth()]} ${String(start.getFullYear()).slice(-2)}`,
      start,
      end,
    });
  }
  return buckets;
}

export function workingDaysInRange(range: DateRange): number {
  let count = 0;
  const cur = new Date(range.from);
  cur.setHours(12, 0, 0, 0);
  const end = new Date(range.to);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function dayOverlapCount(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): number {
  const start = startA > startB ? startA : startB;
  const end = endA < endB ? endA : endB;
  if (start > end) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}
