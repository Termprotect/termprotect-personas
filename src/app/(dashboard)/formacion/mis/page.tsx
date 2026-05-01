import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TRAINING_MODE_LABELS } from "@/lib/validators/training";
import { ENROLLMENT_STATUS_LABELS } from "@/lib/validators/enrollment";
import MisFormacionesActions from "./MisFormacionesActions";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  ShieldAlert,
} from "lucide-react";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date | null) => {
  if (!d) return "—";
  return d.toISOString().slice(0, 10).split("-").reverse().join("/");
};

const STATUS_COLOR: Record<string, string> = {
  INSCRITO: "bg-accent/15 text-accent border-accent/30",
  COMPLETADO: "bg-success/10 text-success border-success/20",
  NO_ASISTIO: "bg-warning/10 text-warning border-warning/20",
  CANCELADO: "bg-muted text-muted-foreground border-border",
};

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const rows = await db.trainingEnrollment.findMany({
    where: { employeeId: session.user.id },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      status: true,
      completedAt: true,
      hoursCompleted: true,
      certificateUrl: true,
      training: {
        select: {
          id: true,
          title: true,
          provider: true,
          mode: true,
          hours: true,
          mandatory: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });

  const stats = {
    total: rows.length,
    inscritos: rows.filter((r) => r.status === "INSCRITO").length,
    completados: rows.filter((r) => r.status === "COMPLETADO").length,
    obligatorias: rows.filter((r) => r.training.mandatory).length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis formaciones</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Formaciones en las que estás inscrito o has participado.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<BookOpen className="w-4 h-4" />} label="Total" value={stats.total} />
        <Stat icon={<Clock className="w-4 h-4" />} label="En curso" value={stats.inscritos} />
        <Stat icon={<CheckCircle2 className="w-4 h-4" />} label="Completadas" value={stats.completados} />
        <Stat icon={<ShieldAlert className="w-4 h-4" />} label="Obligatorias" value={stats.obligatorias} />
      </div>

      {rows.length === 0 ? (
        <div className="bg-background rounded-xl border border-dashed border-border p-10 text-center">
          <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">
            No tienes formaciones asignadas todavía.
          </p>
        </div>
      ) : (
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Formación</th>
                  <th className="px-4 py-2 text-left">Modalidad</th>
                  <th className="px-4 py-2 text-left">Horas</th>
                  <th className="px-4 py-2 text-left">Fechas</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Finalización</th>
                  <th className="px-4 py-2 text-left">Certificado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((e) => (
                  <tr key={e.id} className="hover:bg-secondary">
                    <td className="px-4 py-2">
                      <div className="flex items-start gap-2">
                        <div>
                          <Link
                            href={`/formacion/${e.training.id}`}
                            className="font-medium text-foreground hover:text-accent"
                          >
                            {e.training.title}
                          </Link>
                          {e.training.provider && (
                            <p className="text-xs text-muted-foreground">
                              {e.training.provider}
                            </p>
                          )}
                        </div>
                        {e.training.mandatory && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-destructive/10 text-destructive border border-destructive/20 rounded text-[10px] font-semibold">
                            <ShieldAlert className="w-2.5 h-2.5" />
                            Obligatoria
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {TRAINING_MODE_LABELS[e.training.mode]}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {e.hoursCompleted != null
                        ? `${e.hoursCompleted} / ${e.training.hours} h`
                        : `${e.training.hours} h`}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {e.training.startDate
                        ? `${fmtDate(e.training.startDate)}${
                            e.training.endDate
                              ? ` → ${fmtDate(e.training.endDate)}`
                              : ""
                          }`
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded-md text-xs font-semibold ${STATUS_COLOR[e.status]}`}
                      >
                        {e.status === "COMPLETADO" && <CheckCircle2 className="w-3 h-3" />}
                        {e.status === "NO_ASISTIO" && <XCircle className="w-3 h-3" />}
                        {e.status === "CANCELADO" && <Ban className="w-3 h-3" />}
                        {ENROLLMENT_STATUS_LABELS[
                          e.status as keyof typeof ENROLLMENT_STATUS_LABELS
                        ]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {e.completedAt ? fmtDate(e.completedAt) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <MisFormacionesActions
                        enrollmentId={e.id}
                        hasCertificate={!!e.certificateUrl}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-[11px] uppercase tracking-wide font-semibold">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
