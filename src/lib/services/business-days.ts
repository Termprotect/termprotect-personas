import { db } from "@/lib/db";

/**
 * Normaliza una fecha a UTC 00:00 (para comparar contra campos @db.Date).
 */
export function toUtcDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Devuelve las fechas (UTC 00:00) entre from y to (ambos inclusive).
 */
export function eachDayUtc(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const cur = toUtcDate(from);
  const end = toUtcDate(to);
  while (cur.getTime() <= end.getTime()) {
    out.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function isWeekendUtc(d: Date): boolean {
  const day = d.getUTCDay(); // 0 = Sun, 6 = Sat
  return day === 0 || day === 6;
}

/**
 * Lista de festivos de una sede en un rango (inclusive) como Set de ISO yyyy-mm-dd.
 */
export async function getSedeHolidaysSet(
  sedeId: string,
  from: Date,
  to: Date
): Promise<Set<string>> {
  const rows = await db.sedeCalendar.findMany({
    where: {
      sedeId,
      date: { gte: toUtcDate(from), lte: toUtcDate(to) },
    },
    select: { date: true },
  });
  const set = new Set<string>();
  for (const r of rows) {
    set.add(r.date.toISOString().slice(0, 10));
  }
  return set;
}

/**
 * Cuenta días laborables (L-V) en el rango [from, to] descontando festivos de la sede.
 */
export async function countBusinessDays(params: {
  sedeId: string;
  from: Date;
  to: Date;
}): Promise<number> {
  const { sedeId, from, to } = params;
  if (toUtcDate(from).getTime() > toUtcDate(to).getTime()) return 0;
  const holidays = await getSedeHolidaysSet(sedeId, from, to);
  let count = 0;
  for (const d of eachDayUtc(from, to)) {
    if (isWeekendUtc(d)) continue;
    if (holidays.has(d.toISOString().slice(0, 10))) continue;
    count++;
  }
  return count;
}
