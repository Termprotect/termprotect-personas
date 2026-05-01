export default function InicioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bienvenido a Termprotect Gestión de Personas
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          El sistema está funcionando correctamente.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="font-semibold text-foreground">Empleados</p>
          <p className="text-sm text-muted-foreground mt-1">Módulo en construcción</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="font-semibold text-foreground">Jornada</p>
          <p className="text-sm text-muted-foreground mt-1">Módulo en construcción</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="font-semibold text-foreground">Ausencias</p>
          <p className="text-sm text-muted-foreground mt-1">Módulo en construcción</p>
        </div>
      </div>
    </div>
  );
}
