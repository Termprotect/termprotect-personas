import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import EditarForm from "./EditarForm";

export const dynamic = "force-dynamic";

export default async function EditarEmpleadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const role = session?.user.role;
  if (role !== "ADMIN" && role !== "RRHH") {
    redirect("/empleados");
  }

  const { id } = await params;

  const [employee, sedes, managers] = await Promise.all([
    db.employee.findUnique({
      where: { id },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        documentType: true,
        documentNumber: true,
        email: true,
        phone: true,
        address: true,
        birthDate: true,
        sedeId: true,
        position: true,
        department: true,
        reportsToId: true,
        contractType: true,
        workMode: true,
        startDate: true,
        endDate: true,
        socialSecurityNumber: true,
        role: true,
        requiresDriving: true,
        bankAccountHolder: true,
        iban: true,
        drivingLicenseNumber: true,
        drivingLicenseCategory: true,
        drivingLicenseExpiresAt: true,
        status: true,
      },
    }),
    db.sede.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.employee.findMany({
      where: {
        status: "ACTIVE",
        role: { in: ["MANAGER", "RRHH", "ADMIN"] },
        id: { not: id }, // no puede reportarse a sí mismo
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

  if (!employee) notFound();

  const initialValues = {
    nombres: employee.nombres,
    apellidos: employee.apellidos,
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    address: employee.address ?? "",
    birthDate: employee.birthDate
      ? employee.birthDate.toISOString().slice(0, 10)
      : "",
    sedeId: employee.sedeId,
    position: employee.position ?? "",
    department: employee.department ?? "",
    reportsToId: employee.reportsToId ?? "",
    contractType: employee.contractType ?? "INDEFINIDO",
    workMode: employee.workMode,
    startDate: employee.startDate
      ? employee.startDate.toISOString().slice(0, 10)
      : "",
    endDate: employee.endDate ? employee.endDate.toISOString().slice(0, 10) : "",
    socialSecurityNumber: employee.socialSecurityNumber ?? "",
    role: employee.role,
    requiresDriving: employee.requiresDriving,
    bankAccountHolder: employee.bankAccountHolder ?? "",
    iban: employee.iban ?? "",
    drivingLicenseNumber: employee.drivingLicenseNumber ?? "",
    drivingLicenseCategory: employee.drivingLicenseCategory ?? "",
    drivingLicenseExpiresAt: employee.drivingLicenseExpiresAt
      ? employee.drivingLicenseExpiresAt.toISOString().slice(0, 10)
      : "",
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href={`/empleados/${id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la ficha
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">
          Editar: {employee.nombres} {employee.apellidos}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {employee.documentType} {employee.documentNumber} · los cambios en campos
          laborales quedan registrados en el historial.
        </p>
      </div>

      <EditarForm
        employeeId={id}
        sedes={sedes}
        managers={managers}
        initialValues={initialValues}
      />
    </div>
  );
}
