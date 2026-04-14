"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const loginSchema = z.object({
  documentNumber: z
    .string()
    .min(8, "El número de documento debe tener al menos 8 caracteres")
    .max(20)
    .transform((v) => v.toUpperCase().trim()),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      documentNumber: data.documentNumber,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Documento o contraseña incorrectos. Contacta con RRHH si no recuerdas tu contraseña.");
      setLoading(false);
      return;
    }

    router.push("/inicio");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-700 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Personas</h1>
          <p className="text-slate-500 text-sm mt-1">Termprotect</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nº de documento (DNI / TIE / Pasaporte)
              </label>
              <input
                {...register("documentNumber")}
                type="text"
                placeholder="ej: 12345678A"
                autoComplete="username"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800
                           placeholder:text-slate-400 uppercase tracking-wider
                           focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                           transition-all"
              />
              {errors.documentNumber && (
                <p className="text-red-500 text-xs mt-1">{errors.documentNumber.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Contraseña
              </label>
              <input
                {...register("password")}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800
                           placeholder:text-slate-400
                           focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                           transition-all"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Error de autenticación */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-medium
                         rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              {loading ? "Accediendo..." : "Entrar"}
            </button>
          </form>

          {/* Aviso de recuperación */}
          <p className="text-center text-xs text-slate-400 mt-6">
            ¿Olvidaste tu contraseña? Contacta con RRHH para que te la restablezcan.
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} Termprotect · Uso interno
        </p>
      </div>
    </div>
  );
}
