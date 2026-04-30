"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Analytics error:", error);
  }, [error]);

  return (
    <Card className="p-8">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            No se pudieron cargar los indicadores
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md">
            Se ha producido un error al obtener los datos. Reintenta o recarga la página. Si persiste, contacta con sistemas.
          </p>
        </div>
        <button
          onClick={reset}
          className="mt-2 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    </Card>
  );
}
