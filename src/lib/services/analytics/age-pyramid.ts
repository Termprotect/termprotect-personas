import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface AgeBucket {
  range: string;
  total: number;
}

export interface AgePyramidResult {
  buckets: AgeBucket[];
  averageAge: number | null;
  total: number;
}

const BUCKETS: Array<{ key: string; min: number; max: number }> = [
  { key: "60+",   min: 60, max: 200 },
  { key: "55-59", min: 55, max: 59  },
  { key: "50-54", min: 50, max: 54  },
  { key: "45-49", min: 45, max: 49  },
  { key: "40-44", min: 40, max: 44  },
  { key: "35-39", min: 35, max: 39  },
  { key: "30-34", min: 30, max: 34  },
  { key: "25-29", min: 25, max: 29  },
  { key: "<25",   min: 0,  max: 24  },
];

function calcAge(birth: Date, now: Date): number {
  const diff = now.getTime() - birth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export async function getAgePyramid(
  scope: Prisma.EmployeeWhereInput,
  now: Date = new Date(),
): Promise<AgePyramidResult> {
  const employees = await db.employee.findMany({
    where: { ...scope, status: "ACTIVE", birthDate: { not: null } },
    select: { birthDate: true },
  });

  const buckets: AgeBucket[] = BUCKETS.map((b) => ({ range: b.key, total: 0 }));
  let sumAge = 0;
  let counted = 0;

  for (const e of employees) {
    if (!e.birthDate) continue;
    const age = calcAge(e.birthDate, now);
    if (age < 14 || age > 100) continue;
    sumAge += age;
    counted += 1;
    const bucketIndex = BUCKETS.findIndex((b) => age >= b.min && age <= b.max);
    if (bucketIndex >= 0) buckets[bucketIndex].total += 1;
  }

  return {
    buckets,
    averageAge: counted > 0 ? Math.round((sumAge / counted) * 10) / 10 : null,
    total: counted,
  };
}
