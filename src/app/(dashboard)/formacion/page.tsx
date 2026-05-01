import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  TRAINING_MODE_LABELS,
  MANDATORY_TYPE_LABELS,
} from "@/lib/validators/training";
import {
  BookOpen,
  Plus,
  Users,
  ShieldAlert,
  Clock,
  Euro,
  Monitor,
  MapPin,
  Award,
  Search,
} from "lucide-react";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date | null) => {
  if (!d) return null;
  return d.toISOString().slice(0, 10).split("-").reverse().join("/");
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; mode?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  const canManage = ["ADMIN", "RRHH"].includes(role);

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const filter = sp.filter ?? "";
  const mode = sp.mode ?? "";

  const where: Prisma.TrainingWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { provider: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filter === "OBLIGATORIA") where.mandatory = true;
  if (filter === "FUNDAE") where.fundaeEligible = true;
  if (mode && ["PRESENCIAL", "ONLINE", "MIXTA"].includes(mode)) {
    where.mode = mode as "PRESENCIAL" | "ONLINE" | "MIXTA";
  }

  const trainings = await db.training.findMany({
    where,
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { enrollments: true } },
    },
  });

  const stats = await Promise.all([
    db.training.count(),
    db.training.count({ where: { mandatory: true } }),
    db.trainingEnrollment.count({ where: { status: "INSCRITO" } }),
    db.trainingEnrollment.count({ where: { status: "COMPLETADO" } }),
  ]);
  const [totalTrainings, totalMandatory, totalActive, totalCompleted] = stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Formación y desarrollo
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Catálogo de formaciones, obligatorias y FUNDAE
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/formacion/mis"
            className="inline-flex items-center gap-2 px-3 py-2 bg-background border border-border hover:bg-secondary text-foreground text-sm font-medium rounded-lg"
          >
            <BookOpen className="w-4 h-4" />
            Mis formaciones
          </Link>
          {canManage && (
            <Link
              href="/formacion/obligatorias"
              className="inline-flex items-center gap-2 px-3 py-2 bg-background border border-border hover:bg-secondary text-foreground text-sm font-medium rounded-lg"
            >
              <ShieldAlert className="w-4 h-4" />
              Matriz obligatorias
            </Link>
          )}
          {canManage && (
            <Link
              href="/formacion/nueva"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Nueva formación
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<BookOpen className="w-4 h-4 text-primary" />}
          label="Formaciones"
          value={totalTrainings}
          accent="blue"
        />
        <StatCard
          icon={<ShieldAlert className="w-4 h-4 text-destructive" />}
          label="Obligatorias"
          value={totalMandatory}
          accent="rose"
        />
        <StatCard
          icon={<Users className="w-4 h-4 text-warning" />}
          label="Inscripciones activas"
          value={totalActive}
          accent="amber"
        />
        <StatCard
          icon={<Award className="w-4 h-4 text-success" />}
          label="Completadas"
          value={totalCompleted}
          accent="emerald"
        />
      </div>

      {/* Filtros */}
      <div className="bg-background rounded-xl border border-border p-4">
        <form className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <Search className="w-3 h-3" />
              Buscar
            </label>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Título o proveedor..."
              className="w-full px-3 py-1.5 border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Tipo
            </label>
            <select
              name="filter"
              defaultValue={filter}
              className="px-3 py-1.5 border border-border rounded-lg text-sm min-w-[140px]"
            >
              <option value="">Todas</option>
              <option value="OBLIGATORIA">Solo obligatorias</option>
              <option value="FUNDAE">Solo FUNDAE</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Modalidad
            </label>
            <select
              name="mode"
              defaultValue={mode}
              className="px-3 py-1.5 border border-border rounded-lg text-sm min-w-[140px]"
            >
              <option value="">Cualquiera</option>
              <option value="PRESENCIAL">Presencial</option>
              <option value="ONLINE">Online</option>
              <option value="MIXTA">Mixta</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg"
          >
            Filtrar
          </button>
        </form>
      </div>

      {/* Listado */}
      {trainings.length === 0 ? (
        <div className="bg-background rounded-xl border border-border p-10 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm font-medium">
            No hay formaciones con estos filtros
          </p>
          {canManage && (
            <Link
              href="/formacion/nueva"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Crear la primera
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {trainings.map((t) => (
            <TrainingCard
              key={t.id}
              id={t.id}
              title={t.title}
              provider={t.provider}
              mode={t.mode}
              hours={t.hours}
              cost={t.cost}
              mandatory={t.mandatory}
              mandatoryType={t.mandatoryType}
              fundaeEligible={t.fundaeEligible}
              startDate={t.startDate}
              endDate={t.endDate}
              enrolledCount={t._count.enrollments}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: "blue" | "rose" | "amber" | "emerald";
}) {
  const bg = {
    blue: "bg-info/10",
    rose: "bg-destructive/10",
    amber: "bg-warning/10",
    emerald: "bg-success/10",
  }[accent];
  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function TrainingCard({
  id,
  title,
  provider,
  mode,
  hours,
  cost,
  mandatory,
  mandatoryType,
  fundaeEligible,
  startDate,
  endDate,
  enrolledCount,
}: {
  id: string;
  title: string;
  provider: string | null;
  mode: "PRESENCIAL" | "ONLINE" | "MIXTA";
  hours: number;
  cost: number | null;
  mandatory: boolean;
  mandatoryType: string | null;
  fundaeEligible: boolean;
  startDate: Date | null;
  endDate: Date | null;
  enrolledCount: number;
}) {
  const modeIcon =
    mode === "ONLINE" ? (
      <Monitor className="w-3 h-3" />
    ) : mode === "PRESENCIAL" ? (
      <MapPin className="w-3 h-3" />
    ) : (
      <BookOpen className="w-3 h-3" />
    );

  return (
    <Link
      href={`/formacion/${id}`}
      className="bg-background rounded-xl border border-border p-5 hover:border-border hover:shadow-sm transition block"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-foreground line-clamp-2">{title}</h3>
        <div className="flex flex-wrap gap-1 shrink-0">
          {mandatory && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-md text-[10px] font-semibold">
              <ShieldAlert className="w-2.5 h-2.5" />
              Obligatoria
            </span>
          )}
          {fundaeEligible && (
            <span className="inline-flex items-center px-1.5 py-0.5 bg-success/10 text-success border border-success/20 rounded-md text-[10px] font-semibold">
              FUNDAE
            </span>
          )}
        </div>
      </div>

      {provider && (
        <p className="text-xs text-muted-foreground mb-3">{provider}</p>
      )}

      {mandatory && mandatoryType && (
        <p className="text-[11px] text-destructive mb-3">
          {MANDATORY_TYPE_LABELS[
            mandatoryType as keyof typeof MANDATORY_TYPE_LABELS
          ] ?? mandatoryType}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
        <span className="inline-flex items-center gap-1">
          {modeIcon}
          {TRAINING_MODE_LABELS[mode]}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {hours} h
        </span>
        {cost !== null && (
          <span className="inline-flex items-center gap-1">
            <Euro className="w-3 h-3" />
            {cost.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {(startDate || endDate) && (
        <p className="text-[11px] text-muted-foreground mb-2">
          {fmtDate(startDate)} → {fmtDate(endDate) ?? "—"}
        </p>
      )}

      <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Users className="w-3 h-3" />
          {enrolledCount} inscrit{enrolledCount === 1 ? "o" : "os"}
        </span>
        <span className="text-primary font-semibold">Ver detalle →</span>
      </div>
    </Link>
  );
}
