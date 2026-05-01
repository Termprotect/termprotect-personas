// Normaliza una fecha a las 00:00 hora local (día en zona del servidor)
export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Minutos entre dos fechas (positivo)
export function minutesBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
}

// "09:32" desde Date
export function formatTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// "7h 45m" desde minutos
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

// "YYYY-MM" del mes actual
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

// Parseo tolerante de "YYYY-MM". Devuelve inicio (incl) y fin (excl) del mes + label
export function monthRange(ym: string): {
  start: Date;
  end: Date;
  label: string;
  prev: string;
  next: string;
} {
  const match = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!match) return monthRange(currentMonth());
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  const label = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(start);
  const prevDate = new Date(y, m - 2, 1);
  const nextDate = new Date(y, m, 1);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  return { start, end, label, prev: fmt(prevDate), next: fmt(nextDate) };
}

// "lun 07/04"
export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

// Calcula minutos trabajados a partir del TimeEntry en un momento dado.
// Descuenta el breakMinutes acumulado + la pausa en curso (si la hay).
export function workedMinutes(
  entry: {
    clockIn: Date | string;
    clockOut: Date | string | null;
    breakMinutes: number;
    breakStartedAt: Date | string | null;
  },
  now: Date = new Date()
): number {
  const inAt = new Date(entry.clockIn);
  const outAt = entry.clockOut ? new Date(entry.clockOut) : now;
  const total = minutesBetween(inAt, outAt);
  let breaks = entry.breakMinutes;
  if (entry.breakStartedAt && !entry.clockOut) {
    breaks += minutesBetween(new Date(entry.breakStartedAt), now);
  }
  return Math.max(0, total - breaks);
}
