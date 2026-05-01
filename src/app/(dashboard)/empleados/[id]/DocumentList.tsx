"use client";

import { useState } from "react";
import { FileText, Download, Loader2, AlertCircle, AlertTriangle } from "lucide-react";

type DocItem = {
  id: string;
  type: string;
  fileName: string;
  uploadedAt: string;
  expiresAt: string | null;
};

const typeLabel: Record<string, string> = {
  DNI_ANVERSO: "DNI — anverso",
  DNI_REVERSO: "DNI — reverso",
  TIE_ANVERSO: "TIE — anverso",
  TIE_REVERSO: "TIE — reverso",
  PASAPORTE: "Pasaporte",
  CERTIFICADO_BANCARIO: "Certificado bancario",
  PERMISO_CONDUCIR: "Permiso de conducir",
  CONTRATO: "Contrato",
  RGPD: "Cláusula RGPD",
  PRL: "PRL",
  OTRO: "Otro",
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function DocumentList({ documents }: { documents: DocItem[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<{ id: string; msg: string } | null>(null);

  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Sin documentos subidos.</p>
    );
  }

  const openDoc = async (id: string) => {
    setLoadingId(id);
    setErrorId(null);
    try {
      const res = await fetch(`/api/documents/${id}/url`);
      const json = await res.json();
      if (!res.ok) {
        setErrorId({ id, msg: json.error ?? "No se pudo obtener el enlace" });
        return;
      }
      // Abrir en pestaña nueva — el signed URL de Supabase permite ver o descargar
      window.open(json.url, "_blank", "noopener,noreferrer");
    } catch {
      setErrorId({ id, msg: "Error de red" });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <ul className="divide-y divide-border">
      {documents.map((doc) => {
        const days = daysUntil(doc.expiresAt);
        const expired = days !== null && days < 0;
        const soon = days !== null && days >= 0 && days <= 30;
        const label = typeLabel[doc.type] ?? doc.type;
        const isLoading = loadingId === doc.id;
        const err = errorId?.id === doc.id ? errorId.msg : null;

        return (
          <li key={doc.id} className="py-3 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground">{label}</p>
                {expired && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
                    <AlertTriangle className="w-3 h-3" /> Caducado
                  </span>
                )}
                {!expired && soon && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-warning/10 text-warning border border-warning/20">
                    <AlertTriangle className="w-3 h-3" /> Caduca en {days} d
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.fileName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Subido el {formatDate(doc.uploadedAt)}
                {doc.expiresAt && ` · Caduca el ${formatDate(doc.expiresAt)}`}
              </p>
              {err && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {err}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => openDoc(doc.id)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border hover:bg-secondary disabled:opacity-60 rounded-md text-foreground shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              {isLoading ? "Abriendo..." : "Ver"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
