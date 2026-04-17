"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield } from "lucide-react";

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
      .regex(/[0-9]/, "Debe contener al menos un número"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function CambiarPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: data.newPassword }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Error al cambiar la contraseña");
        setLoading(false);
        return;
      }

      setDone(true);
      // Redirigir al endpoint de logout de NextAuth que luego va al login
      setTimeout(() => {
        window.location.href = "/api/auth/signout?callbackUrl=/login";
      }, 1500);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Contraseña actualizada</h2>
          <p className="text-slate-500 text-sm mt-2">Cerrando sesión y redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-700 rounded-2xl mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Cambia tu contraseña</h1>
          <p className="text-slate-500 text-sm mt-1">
            Es tu primer acceso. Elige una contraseña segura para continuar.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nueva contraseña
              </label>
              <input
                {...register("newPassword")}
                type="password"
                placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800
                           placeholder:text-slate-400 focus:outline-none focus:ring-2
                           focus:ring-blue-600 focus:border-transparent transition-all"
              />
              {errors.newPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Repite la contraseña
              </label>
              <input
                {...register("confirmPassword")}
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800
                           placeholder:text-slate-400 focus:outline-none focus:ring-2
                           focus:ring-blue-600 focus:border-transparent transition-all"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-medium
                         rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
