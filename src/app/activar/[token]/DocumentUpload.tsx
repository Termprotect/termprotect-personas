"use client";

import { useState, useRef } from "react";
import { Upload, Check, Loader2, AlertCircle, FileText } from "lucide-react";

export type DocumentSlot = {
  kind: string;
  label: string;
  description?: string;
  required?: boolean;
};

export default function DocumentUpload({
  token,
  slot,
}: {
  token: string;
  slot: DocumentSlot;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<{ fileName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > 10 * 1024 * 1024) {
      setError("El archivo supera los 10 MB");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", slot.kind);
      const res = await fetch(`/api/upload/document/${token}`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo subir");
        return;
      }
      setUploaded({ fileName: json.fileName });
    } catch {
      setError("Error de red");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 border border-border rounded-lg">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{slot.label}</p>
          {slot.required && <span className="text-xs text-destructive">*</span>}
        </div>
        {slot.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{slot.description}</p>
        )}

        {uploaded ? (
          <p className="text-xs text-success mt-1 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Subido: {uploaded.fileName}
            <button
              type="button"
              onClick={() => {
                setUploaded(null);
                inputRef.current?.click();
              }}
              className="ml-2 text-muted-foreground hover:text-foreground underline"
            >
              Reemplazar
            </button>
          </p>
        ) : (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-border hover:bg-secondary disabled:opacity-60 rounded-md text-foreground"
            >
              {uploading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Upload className="w-3 h-3" />
              )}
              {uploading ? "Subiendo..." : "Seleccionar archivo"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP o PDF. Máx 10 MB.</p>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        )}
      </div>
    </div>
  );
}
