import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import PlantillasClient from "./PlantillasClient";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "RRHH"].includes(session.user.role))
    redirect("/evaluaciones");

  const sp = await searchParams;
  const includeArchived = sp.archived === "1";

  const where: Prisma.EvalTemplateWhereInput = includeArchived
    ? {}
    : { archived: false };

  const templates = await db.evalTemplate.findMany({
    where,
    orderBy: [{ archived: "asc" }, { name: "asc" }],
    include: { _count: { select: { evaluations: true } } },
  });

  const items = templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    questions: (t.questions as { id: string; label: string; help?: string }[]) ?? [],
    archived: t.archived,
    usage: t._count.evaluations,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/evaluaciones"
          className="text-muted-foreground hover:text-muted-foreground text-sm"
        >
          ← Volver
        </Link>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Plantillas de evaluación
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Conjuntos de preguntas (1-5) reutilizables para ciclos por pares.
            Las evaluaciones anuales siguen usando las 8 competencias fijas.
          </p>
        </div>
      </div>

      <PlantillasClient items={items} includeArchived={includeArchived} />
    </div>
  );
}
