import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import TrainingForm from "../../TrainingForm";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "RRHH"].includes(session.user.role)) redirect("/formacion");

  const { id } = await params;
  const t = await db.training.findUnique({ where: { id } });
  if (!t) notFound();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href={`/formacion/${id}`}
          className="text-muted-foreground hover:text-muted-foreground text-sm"
        >
          ← Volver
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Editar formación</h1>
        <p className="text-muted-foreground text-sm mt-1">{t.title}</p>
      </div>

      <TrainingForm
        mode="edit"
        initial={{
          id: t.id,
          title: t.title,
          provider: t.provider ?? "",
          mode: t.mode,
          hours: String(t.hours),
          cost: t.cost !== null ? String(t.cost) : "",
          mandatory: t.mandatory,
          mandatoryType: t.mandatoryType ?? "",
          fundaeEligible: t.fundaeEligible,
          description: t.description ?? "",
          startDate: t.startDate ? t.startDate.toISOString().slice(0, 10) : "",
          endDate: t.endDate ? t.endDate.toISOString().slice(0, 10) : "",
        }}
      />
    </div>
  );
}
