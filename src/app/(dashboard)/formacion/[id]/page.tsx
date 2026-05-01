import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  TRAINING_MODE_LABELS,
  MANDATORY_TYPE_LABELS,
} from "@/lib/validators/training";
import {
  BookOpen,
  Clock,
  Euro,
  Monitor,
  MapPin,
  ShieldAlert,
  Users,
  Edit3,
  Calendar,
} from "lucide-react";
import EnrollmentsPanel from "./EnrollmentsPanel";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date | null) => {
  if (!d) return "—";
  return d.toISOString().slice(0, 10).split("-").reverse().join("/");
};

const BLOCKED_STATUS = ["INVITADO", "BAJA_VOLUNTARIA", "DESPIDO"] as const;

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const t = await db.training.findUnique({
    where: { id },
    include: {
      _count: { select: { enrollments: true } },
    },
  });
  if (!t) notFound();

  const canManage = ["ADMIN", "RRHH"].includes(session.user.role);

  const modeIcon =
    t.mode === "ONLINE" ? (
      <Monitor className="w-4 h-4" />
    ) : t.mode === "PRESENCIAL" ? (
      <MapPin className="w-4 h-4" />
    ) : (
      <BookOpen className="w-4 h-4" />
    );

  // Carga de inscripciones + candidatos
  const [enrollments, candidates] = await Promise.all([
    db.trainingEnrollment.findMany({
      where: { trainingId: t.id },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        status: true,
        completedAt: true,
        hoursCompleted: true,
        certificateUrl: true,
        createdAt: true,
        employee: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            position: true,
            sede: { select: { name: true } },
          },
        },
      },
    }),
    canManage
      ? db.employee.findMany({
          where: {
            status: { notIn: [...BLOCKED_STATUS] },
          },
          orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            position: true,
            sede: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const enrolledIds = new Set(enrollments.map((e) => e.employee.id));
  const availableCandidates = candidates
    .filter((c) => !enrolledIds.has(c.id))
    .map((c) => ({
      id: c.id,
      fullName: `${c.apellidos}, ${c.nombres}`,
      position: c.position ?? "",
      sede: c.sede?.name ?? "",
    }));

  const enrollmentsData = enrollments.map((e) => ({
    id: e.id,
    status: e.status,
    completedAt: e.completedAt ? e.completedAt.toISOString().slice(0, 10) : null,
    hoursCompleted: e.hoursCompleted,
    hasCertificate: !!e.certificateUrl,
    createdAt: e.createdAt.toISOString(),
    employee: {
      id: e.employee.id,
      fullName: `${e.employee.apellidos}, ${e.employee.nombres}`,
      position: e.employee.position ?? "",
      sede: e.employee.sede?.name ?? "",
    },
  }));

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

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
            {t.mandatory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-md text-xs font-semibold">
                <ShieldAlert className="w-3 h-3" />
                Obligatoria
              </span>
            )}
            {t.fundaeEligible && (
              <span className="inline-flex items-center px-2 py-0.5 bg-success/10 text-success border border-success/20 rounded-md text-xs font-semibold">
                FUNDAE
              </span>
            )}
          </div>
          {t.provider && (
            <p className="text-muted-foreground text-sm">Proveedor: {t.provider}</p>
          )}
        </div>

        {canManage && (
          <Link
            href={`/formacion/${t.id}/editar`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border hover:bg-secondary text-foreground text-sm font-medium rounded-lg"
          >
            <Edit3 className="w-4 h-4" />
            Editar
          </Link>
        )}
      </div>

      {/* Datos principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoBlock
          icon={modeIcon}
          label="Modalidad"
          value={TRAINING_MODE_LABELS[t.mode]}
        />
        <InfoBlock
          icon={<Clock className="w-4 h-4" />}
          label="Horas"
          value={`${t.hours} h`}
        />
        <InfoBlock
          icon={<Euro className="w-4 h-4" />}
          label="Coste"
          value={
            t.cost !== null
              ? `${t.cost.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`
              : "—"
          }
        />
        <InfoBlock
          icon={<Users className="w-4 h-4" />}
          label="Inscritos"
          value={String(t._count.enrollments)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <InfoBlock
          icon={<Calendar className="w-4 h-4" />}
          label="Inicio"
          value={fmtDate(t.startDate)}
        />
        <InfoBlock
          icon={<Calendar className="w-4 h-4" />}
          label="Fin"
          value={fmtDate(t.endDate)}
        />
      </div>

      {t.mandatory && t.mandatoryType && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">
              Formación obligatoria —{" "}
              {MANDATORY_TYPE_LABELS[
                t.mandatoryType as keyof typeof MANDATORY_TYPE_LABELS
              ] ?? t.mandatoryType}
            </p>
            <p className="text-xs text-destructive mt-1">
              Es responsabilidad de RRHH garantizar que todos los empleados
              afectados la completen.
            </p>
          </div>
        </div>
      )}

      {t.description && (
        <div className="bg-background rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-2">
            Descripción
          </h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {t.description}
          </p>
        </div>
      )}

      <EnrollmentsPanel
        trainingId={t.id}
        canManage={canManage}
        initialEnrollments={enrollmentsData}
        candidates={availableCandidates}
      />
    </div>
  );
}

function InfoBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-[11px] uppercase tracking-wide font-semibold">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
