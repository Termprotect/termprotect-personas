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
        <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center text-destructive">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            No se pudieron cargar los indicadores
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Se ha producido un error al obtener los datos. Reintenta o recarga la página. Si persiste, contacta con sistemas.
          </p>
        </div>
        <button
          onClick={reset}
          className="mt-2 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90"
        >
          Reintentar
        </button>
      </div>
    </Card>
  );
}
