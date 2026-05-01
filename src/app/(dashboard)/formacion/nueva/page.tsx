import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import TrainingForm from "../TrainingForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "RRHH"].includes(session.user.role)) redirect("/formacion");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/formacion"
          className="text-muted-foreground hover:text-muted-foreground text-sm"
        >
          ← Volver
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nueva formación</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Alta de una formación para el catálogo
        </p>
      </div>

      <TrainingForm
        mode="create"
        initial={{
          title: "",
          provider: "",
          mode: "PRESENCIAL",
          hours: "",
          cost: "",
          mandatory: false,
          mandatoryType: "",
          fundaeEligible: false,
          description: "",
          startDate: "",
          endDate: "",
        }}
      />
    </div>
  );
}
