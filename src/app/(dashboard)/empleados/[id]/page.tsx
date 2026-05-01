import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, User, Mail, Phone, MapPin, Briefcase, Building2, Calendar, ShieldCheck, Truck, CircleUser, History as HistoryIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import StatusBadge from "../StatusBadge";
import DocumentList from "./DocumentList";
import HistoryList from "./HistoryList";
import EmployeeActions from "./EmployeeActions";

export const dynamic = "force-dynamic";

const roleLabel: Record<string, string> = {
  ADMIN: "Administrador",
  RRHH: "RRHH",
  MANAGER: "Manager",
  EMPLEADO: "Empleado",
};

const contractLabel: Record<string, string> = {
  INDEFINIDO: "Indefinido",
  TEMPORAL: "Temporal",
  FORMACION: "Formación",
  PRACTICAS: "Prácticas",
};

const emergencyLabel: Record<string, string> = {
  CONYUGE: "Cónyuge / pareja",
  PADRE_MADRE: "Padre / madre",
  HERMANO_A: "Hermano/a",
  HIJO_A: "Hijo/a",
  OTRO: "Otro",
};

const workModeLabel: Record<string, string> = {
  PRESENCIAL: "Presencial",
  TELETRABAJO: "Teletrabajo",
  HIBRIDO: "Híbrido",
};

function formatDate(date: Date | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export default async function EmpleadoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const canEdit = session?.user.role === "ADMIN" || session?.user.role === "RRHH";

  const employee = await db.employee.findUnique({
    where: { id },
    include: {
      sede: { select: { name: true, convenioName: true } },
      reportsTo: { select: { id: true, nombres: true, apellidos: true } },
      documents: { orderBy: { uploadedAt: "desc" } },
      history: { orderBy: { changedAt: "desc" }, take: 30 },
    },
  });

  if (!employee) notFound();

  // Resolver IDs del historial a nombres legibles (sede, reportsTo, actores)
  const sedeIds = new Set<string>();
  const employeeRefIds = new Set<string>();
  const actorIds = new Set<string>();
  for (const h of employee.history) {
    if (h.field === "sedeId") {
      if (h.oldValue) sedeIds.add(h.oldValue);
      if (h.newValue) sedeIds.add(h.newValue);
    }
    if (h.field === "reportsToId") {
      if (h.oldValue) employeeRefIds.add(h.oldValue);
      if (h.newValue) employeeRefIds.add(h.newValue);
    }
    actorIds.add(h.changedBy);
  }

  const [sedeMap, employeeRefMap, actorMap] = await Promise.all([
    sedeIds.size > 0
      ? db.sede
          .findMany({
            where: { id: { in: [...sedeIds] } },
            select: { id: true, name: true },
          })
          .then((r) => new Map(r.map((s) => [s.id, s.name])))
      : Promise.resolve(new Map<string, string>()),
    employeeRefIds.size > 0
      ? db.employee
          .findMany({
            where: { id: { in: [...employeeRefIds] } },
            select: { id: true, nombres: true, apellidos: true },
          })
          .then(
            (r) =>
              new Map(
                r.map((e) => [e.id, `${e.nombres} ${e.apellidos}`])
              )
          )
      : Promise.resolve(new Map<string, string>()),
    actorIds.size > 0
      ? db.employee
          .findMany({
            where: { id: { in: [...actorIds] } },
            select: { id: true, nombres: true, apellidos: true },
          })
          .then(
            (r) =>
              new Map(
                r.map((e) => [e.id, `${e.nombres} ${e.apellidos}`])
              )
          )
      : Promise.resolve(new Map<string, string>()),
  ]);

  const historyItems = employee.history.map((h) => {
    let oldVal = h.oldValue;
    let newVal = h.newValue;
    if (h.field === "sedeId") {
      oldVal = oldVal ? sedeMap.get(oldVal) ?? oldVal : null;
      newVal = newVal ? sedeMap.get(newVal) ?? newVal : null;
    }
    if (h.field === "reportsToId") {
      oldVal = oldVal ? employeeRefMap.get(oldVal) ?? oldVal : null;
      newVal = newVal ? employeeRefMap.get(newVal) ?? newVal : null;
    }
    return {
      id: h.id,
      field: h.field,
      oldValue: oldVal,
      newValue: newVal,
      changedAt: h.changedAt.toISOString(),
      changedBy: h.changedBy,
      actorName: actorMap.get(h.changedBy) ?? null,
      reason: h.reason ?? null,
    };
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link
          href="/empleados"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al listado
        </Link>
      </div>

      {/* Cabecera */}
      <div className="bg-background rounded-xl border border-border p-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
            {employee.photoUrl ? (
              <Image
                src={employee.photoUrl}
                alt={`${employee.nombres} ${employee.apellidos}`}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {employee.nombres} {employee.apellidos}
                </h1>
                <p className="text-muted-foreground mt-0.5">
                  {employee.position ?? "—"}
                  {employee.department && ` · ${employee.department}`}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={employee.status} />
                  <span className="text-xs text-muted-foreground">
                    {roleLabel[employee.role] ?? employee.role}
                  </span>
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/empleados/${employee.id}/editar`}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-border hover:bg-secondary rounded-lg text-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                    Editar
                  </Link>
                  <EmployeeActions
                    employeeId={employee.id}
                    currentStatus={employee.status}
                    hasEmail={Boolean(employee.email)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de información */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Datos personales" icon={CircleUser}>
          <Item label="Nombres" value={employee.nombres} />
          <Item label="Apellidos" value={employee.apellidos} />
          <Item label="Documento" value={`${employee.documentType} ${employee.documentNumber}`} mono />
          <Item label="Fecha de nacimiento" value={formatDate(employee.birthDate)} />
          <Item label="Dirección" value={employee.address ?? "—"} />
        </Card>

        <Card title="Contacto" icon={Mail}>
          <Item label="Email" value={employee.email ?? "—"} icon={Mail} />
          <Item label="Teléfono" value={employee.phone ?? "—"} icon={Phone} />
          <Item
            label="Contacto de emergencia"
            value={
              employee.emergencyName
                ? `${employee.emergencyName} (${emergencyLabel[employee.emergencyRelation ?? ""] ?? "—"})`
                : "—"
            }
          />
          <Item label="Tel. emergencia" value={employee.emergencyPhone ?? "—"} />
        </Card>

        <Card title="Datos laborales" icon={Briefcase}>
          <Item label="Cargo" value={employee.position ?? "—"} />
          <Item label="Departamento" value={employee.department ?? "—"} />
          <Item label="Sede" value={employee.sede.name} icon={Building2} />
          <Item label="Convenio" value={employee.sede.convenioName ?? "—"} />
          <Item
            label="Jefe directo"
            value={
              employee.reportsTo
                ? `${employee.reportsTo.nombres} ${employee.reportsTo.apellidos}`
                : "—"
            }
          />
          <Item label="Modalidad" value={workModeLabel[employee.workMode] ?? employee.workMode} />
          <Item label="Contrato" value={employee.contractType ? contractLabel[employee.contractType] : "—"} />
          <Item label="Fecha de alta" value={formatDate(employee.startDate)} icon={Calendar} />
          <Item label="Fin de contrato" value={formatDate(employee.endDate)} />
          <Item label="Nº Seguridad Social" value={employee.socialSecurityNumber ?? "—"} mono />
        </Card>

        <Card title="Datos bancarios" icon={ShieldCheck}>
          <Item label="Titular" value={employee.bankAccountHolder ?? "—"} />
          <Item label="IBAN" value={employee.iban ?? "—"} mono />
        </Card>

        {employee.requiresDriving && (
          <Card title="Conducción" icon={Truck}>
            <Item label="Nº permiso" value={employee.drivingLicenseNumber ?? "—"} />
            <Item label="Categoría" value={employee.drivingLicenseCategory ?? "—"} />
            <Item label="Caducidad permiso" value={formatDate(employee.drivingLicenseExpiresAt)} />
          </Card>
        )}

        <Card title="Cláusula RGPD" icon={ShieldCheck}>
          {employee.clausulaAcceptedAt ? (
            <>
              <Item label="Versión" value={employee.clausulaVersion ?? "—"} />
              <Item label="Firmada el" value={formatDate(employee.clausulaAcceptedAt)} />
              <Item label="IP" value={employee.clausulaAcceptedIp ?? "—"} mono />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Pendiente de firma.</p>
          )}
        </Card>
      </div>

      {/* Documentos */}
      <div className="bg-background rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Documentos ({employee.documents.length})
        </h2>
        <DocumentList documents={employee.documents.map((d) => ({
          id: d.id,
          type: d.type,
          fileName: d.fileName,
          uploadedAt: d.uploadedAt.toISOString(),
          expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
        }))} />
      </div>

      {/* Historial de cambios */}
      <div className="bg-background rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center">
            <HistoryIcon className="w-3.5 h-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">
            Historial de cambios ({historyItems.length})
          </h2>
        </div>
        <HistoryList items={historyItems} />
      </div>

      {/* Metadatos */}
      <div className="bg-background rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Actividad</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <Item label="Alta en el sistema" value={formatDate(employee.createdAt)} />
          <Item label="Último acceso" value={employee.lastLogin ? formatDate(employee.lastLogin) : "—"} />
          <Item label="Invitación enviada" value={formatDate(employee.invitationSentAt)} />
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <dl className="space-y-2.5">{children}</dl>
    </div>
  );
}

function Item({
  label,
  value,
  icon: Icon,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className={`text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value}</dd>
      </div>
    </div>
  );
}

// Suppress unused import warning for MapPin (kept for future address icon use)
void MapPin;
