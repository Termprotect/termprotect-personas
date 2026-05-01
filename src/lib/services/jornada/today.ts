import { db } from "@/lib/db";

export type TodayStatus = "TRABAJANDO" | "EN_PAUSA" | "FINALIZADA" | "SIN_FICHAR";

export interface MyTodaySnapshot {
  clockInAt: Date | null;
  clockOutAt: Date | null;
  workedMinutes: number;
  pauseMinutes: number;
  expectedMinutes: number;
  status: TodayStatus;
  sedeName: string | null;
  entriesCount: number;
}

const EXPECTED_MINUTES_DEFAULT = 480;

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

export async function getMyToday(
  employeeId: string,
  now: Date = new Date(),
): Promise<MyTodaySnapshot> {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: { sede: { select: { name: true } } },
  });

  const entries = await db.timeEntry.findMany({
    where: {
      employeeId,
      date: { gte: startOfDay(now), lte: endOfDay(now) },
    },
    orderBy: { clockIn: "asc" },
    select: { clockIn: true, clockOut: true, breakMinutes: true },
  });

  if (entries.length === 0) {
    return {
      clockInAt: null,
      clockOutAt: null,
      workedMinutes: 0,
      pauseMinutes: 0,
      expectedMinutes: EXPECTED_MINUTES_DEFAULT,
      status: "SIN_FICHAR",
      sedeName: employee?.sede?.name ?? null,
      entriesCount: 0,
    };
  }

  const first = entries[0];
  const last = entries[entries.length - 1];

  let workedMinutes = 0;
  let pauseMinutes = 0;
  for (const e of entries) {
    pauseMinutes += e.breakMinutes ?? 0;
    const end = e.clockOut ?? now;
    const ms = end.getTime() - e.clockIn.getTime();
    workedMinutes += Math.max(0, Math.floor(ms / 60_000) - (e.breakMinutes ?? 0));
  }

  const status: TodayStatus = !last.clockOut ? "TRABAJANDO" : "FINALIZADA";

  return {
    clockInAt: first.clockIn,
    clockOutAt: last.clockOut ?? null,
    workedMinutes,
    pauseMinutes,
    expectedMinutes: EXPECTED_MINUTES_DEFAULT,
    status,
    sedeName: employee?.sede?.name ?? null,
    entriesCount: entries.length,
  };
}
