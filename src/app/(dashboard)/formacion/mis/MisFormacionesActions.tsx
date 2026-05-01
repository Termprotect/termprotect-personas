"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";

export default function MisFormacionesActions({
  enrollmentId,
  hasCertificate,
}: {
  enrollmentId: string;
  hasCertificate: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function openCertificate() {
    const res = await fetch(`/api/enrollments/${enrollmentId}/certificate`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(json.error ?? "No se pudo abrir el certificado");
      return;
    }
    if (json.url) window.open(json.url, "_blank", "noopener,noreferrer");
  }

  async function uploadCertificate(f: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(`/api/enrollments/${enrollmentId}/certificate`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error ?? "Error al subir certificado");
      }
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-1">
      {hasCertificate ? (
        <button
          onClick={openCertificate}
          className="inline-flex items-center gap-1 px-2 py-1 text-success hover:bg-success/10 rounded-md text-xs font-semibold"
        >
          <Download className="w-3.5 h-3.5" />
          Ver
        </button>
      ) : (
        <span className="text-xs text-muted-foreground">Sin subir</span>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadCertificate(f);
        }}
      />
      <button
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="p-1 text-muted-foreground hover:bg-muted rounded-md disabled:opacity-50"
        title={hasCertificate ? "Reemplazar" : "Subir certificado"}
      >
        <Upload className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
