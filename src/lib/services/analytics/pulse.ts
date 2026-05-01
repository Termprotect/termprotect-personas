import { db } from "@/lib/db";

export interface PulseSnapshot {
  current: number;
  series: number[]; // 60 buckets, one per minute (oldest first)
}

/**
 * Returns a per-minute count of TimeEntry events for the last 60 minutes.
 * Used by the topbar Pulse heartbeat.
 */
export async function getPulse(now: Date = new Date()): Promise<PulseSnapshot> {
  const since = new Date(now.getTime() - 60 * 60 * 1000);

  const events = await db.timeEntry.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const buckets = new Array<number>(60).fill(0);
  for (const e of events) {
    const minutesAgo = Math.floor((now.getTime() - e.createdAt.getTime()) / 60_000);
    const idx = 59 - Math.min(59, Math.max(0, minutesAgo));
    buckets[idx] += 1;
  }

  return {
    current: buckets[buckets.length - 1] ?? 0,
    series: buckets,
  };
}
