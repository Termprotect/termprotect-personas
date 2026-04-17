export default function InicioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Bienvenido a Termprotect Gestión de Personas
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          El sistema está funcionando correctamente.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="font-semibold text-slate-700">Empleados</p>
          <p className="text-sm text-slate-400 mt-1">Módulo en construcción</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="font-semibold text-slate-700">Jornada</p>
          <p className="text-sm text-slate-400 mt-1">Módulo en construcción</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="font-semibold text-slate-700">Ausencias</p>
          <p className="text-sm text-slate-400 mt-1">Módulo en construcción</p>
        </div>
      </div>
    </div>
  );
}
