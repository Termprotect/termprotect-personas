export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">People Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Indicadores clave de gestión de personas</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <p className="text-slate-600 font-medium">Módulo en construcción</p>
        <p className="text-slate-400 text-sm mt-1">Este módulo estará disponible próximamente.</p>
      </div>
    </div>
  );
}
