import { db } from "@/lib/db";
import { Clock, XCircle } from "lucide-react";

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
      nombres: true,
      apellidos: true,
      invitationTokenExpiresAt: true,
      status: true,
    },
  });

  const expired =
    employee?.invitationTokenExpiresAt &&
    employee.invitationTokenExpiresAt < new Date();

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        {!employee ? (
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6 text-rose-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Enlace no válido</h1>
            <p className="text-sm text-slate-500">
              Este enlace de invitación no existe o ya ha sido utilizado.
              Pide a Recursos Humanos una nueva invitación.
            </p>
          </div>
        ) : expired ? (
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Enlace caducado</h1>
            <p className="text-sm text-slate-500">
              El enlace de invitación ha caducado. Pide a Recursos Humanos que te envíe uno nuevo.
            </p>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <h1 className="text-xl font-bold text-slate-800">
              Bienvenido/a, {employee.nombres}
            </h1>
            <p className="text-sm text-slate-500">
              El formulario de alta está en construcción. Próximamente podrás crear tu contraseña,
              completar tus datos y firmar la cláusula de protección de datos.
            </p>
            <p className="text-xs text-slate-400 pt-4 border-t border-slate-100">
              Termprotect — Gestión de personas
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
