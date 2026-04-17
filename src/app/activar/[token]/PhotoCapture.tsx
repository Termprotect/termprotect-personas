"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Upload, RotateCcw, Check, Loader2, X } from "lucide-react";

export default function PhotoCapture({
  token,
  onUploaded,
}: {
  token: string;
  onUploaded: (url: string) => void;
}) {
  const [mode, setMode] = useState<"idle" | "camera" | "preview">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMode("camera");
    } catch {
      setError("No se pudo acceder a la cámara. Usa 'Subir archivo' como alternativa.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (b) => {
        if (!b) return;
        setBlob(b);
        setPreview(URL.createObjectURL(b));
        stopCamera();
        setMode("preview");
      },
      "image/jpeg",
      0.85
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen supera los 5 MB");
      return;
    }
    setBlob(file);
    setPreview(URL.createObjectURL(file));
    setMode("preview");
    setError(null);
  };

  const retake = () => {
    setPreview(null);
    setBlob(null);
    setMode("idle");
  };

  const upload = async () => {
    if (!blob) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", blob, "photo.jpg");
      const res = await fetch(`/api/upload/photo/${token}`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo subir la foto");
        setUploading(false);
        return;
      }
      setUploadedUrl(json.url);
      onUploaded(json.url);
    } catch {
      setError("Error de red al subir la foto");
    } finally {
      setUploading(false);
    }
  };

  if (uploadedUrl) {
    return (
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={uploadedUrl}
          alt="Foto de perfil"
          className="w-20 h-20 rounded-full object-cover border-2 border-emerald-300"
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-emerald-700 flex items-center gap-1">
            <Check className="w-4 h-4" /> Foto guardada
          </p>
          <button
            type="button"
            onClick={() => {
              setUploadedUrl(null);
              retake();
            }}
            className="text-xs text-slate-500 hover:text-slate-700 mt-1 inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Cambiar foto
          </button>
        </div>
      </div>
    );
  }

  if (mode === "camera") {
    return (
      <div className="space-y-3">
        <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-w-sm">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={capturePhoto}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
          >
            <Camera className="w-4 h-4" /> Capturar
          </button>
          <button
            type="button"
            onClick={() => { stopCamera(); setMode("idle"); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 text-sm"
          >
            <X className="w-4 h-4" /> Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (mode === "preview" && preview) {
    return (
      <div className="space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Previsualización" className="w-40 h-40 rounded-lg object-cover border border-slate-200" />
        {error && (
          <p className="text-xs text-rose-600">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={upload}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Usar esta foto
          </button>
          <button
            type="button"
            onClick={retake}
            className="inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 text-sm"
          >
            <RotateCcw className="w-4 h-4" /> Volver a intentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={startCamera}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg"
        >
          <Camera className="w-4 h-4" /> Tomar foto
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg"
        >
          <Upload className="w-4 h-4" /> Subir archivo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <p className="text-xs text-slate-400">JPG, PNG o WEBP. Máx 5 MB.</p>
    </div>
  );
}
