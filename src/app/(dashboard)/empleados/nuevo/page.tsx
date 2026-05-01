import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import NuevoEmpleadoForm from "./NuevoEmpleadoForm";

export const dynamic = "force-dynamic";

export default async function NuevoEmpleadoPage() {
  const session = await auth();
  const role = session?.user.role;
  if (role !== "ADMIN" && role !== "RRHH") {
    redirect("/empleados");
  }

  const [sedes, managers] = await Promise.all([
    db.sede.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.employee.findMany({
      where: {
        status: { in: ["ACTIVE"] },
        role: { in: ["MANAGER", "RRHH", "ADMIN"] },
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        position: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/empleados"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al listado
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Nuevo empleado</h1>
        <p className="text-muted-foreground text-sm mt-1">
          El empleado recibirá un email con un enlace para completar su alta (válido 7 días).
        </p>
      </div>

      <NuevoEmpleadoForm sedes={sedes} managers={managers} />
    </div>
  );
}
