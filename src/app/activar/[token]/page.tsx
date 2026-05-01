import { db } from "@/lib/db";
import { Clock, XCircle } from "lucide-react";
import ActivarForm from "./ActivarForm";

export const dynamic = "force-dynamic";

export default async function ActivarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const employee = await db.employee.findUnique({
    where: { invitationToken: token },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      email: true,
      documentType: true,
      documentNumber: true,
      position: true,
      requiresDriving: true,
      status: true,
      invitationTokenExpiresAt: true,
      sede: { select: { name: true } },
    },
  });

  // Errores de acceso
  if (!employee) return <ErrorCard title="Enlace no válido" message="Este enlace de invitación no existe o ya ha sido utilizado. Pide a Recursos Humanos una nueva invitación." variant="error" />;
  if (employee.status !== "INVITADO") return <ErrorCard title="Cuenta ya activada" message="Esta cuenta ya ha sido activada. Accede con tu número de documento y contraseña desde la pantalla de login." variant="info" />;
  if (employee.invitationTokenExpiresAt && employee.invitationTokenExpiresAt < new Date()) {
    return <ErrorCard title="Enlace caducado" message="El enlace de invitación ha caducado. Pide a Recursos Humanos que te envíe uno nuevo." variant="warning" />;
  }

  return (
    <main className="min-h-screen bg-secondary py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Completa tu alta en Termprotect</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hola <strong>{employee.nombres} {employee.apellidos}</strong>. Revisa los datos precargados por RRHH, completa tu información y crea tu contraseña.
          </p>
        </div>

        <div className="bg-background rounded-xl border border-border p-5 mb-5">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Datos registrados por RRHH</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <Row label="Nombre" value={`${employee.nombres} ${employee.apellidos}`} />
            <Row label="Documento" value={`${employee.documentType} ${employee.documentNumber}`} />
            <Row label="Email" value={employee.email ?? "—"} />
            <Row label="Cargo" value={employee.position ?? "—"} />
            <Row label="Sede" value={employee.sede.name} />
            <Row label="Conducción de vehículos" value={employee.requiresDriving ? "Sí" : "No"} />
          </dl>
          <p className="text-xs text-muted-foreground mt-3">
            Si alguno de estos datos es incorrecto, contacta con RRHH antes de continuar.
          </p>
        </div>

        <ActivarForm
          token={token}
          requiresDriving={employee.requiresDriving}
          documentType={employee.documentType as "DNI" | "TIE" | "PASAPORTE"}
        />
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-foreground font-medium">{value}</dd>
    </div>
  );
}

function ErrorCard({
  title,
  message,
  variant,
}: {
  title: string;
  message: string;
  variant: "error" | "warning" | "info";
}) {
  const config = {
    error: { bg: "bg-destructive/10", icon: "text-destructive", Icon: XCircle },
    warning: { bg: "bg-warning/10", icon: "text-warning", Icon: Clock },
    info: { bg: "bg-accent/15", icon: "text-accent", Icon: Clock },
  }[variant];
  const Icon = config.Icon;
  return (
    <main className="min-h-screen bg-secondary flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-background rounded-xl border border-border shadow-sm p-8 text-center space-y-3">
        <div className={`w-12 h-12 rounded-full ${config.bg} flex items-center justify-center mx-auto`}>
          <Icon className={`w-6 h-6 ${config.icon}`} />
        </div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}
