"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle } from "lucide-react";
import { createEmployeeSchema, type CreateEmployeeInput } from "@/lib/validators/employee";

type Sede = { id: string; name: string };
type Manager = { id: string; nombres: string; apellidos: string; position: string | null };

export default function NuevoEmpleadoForm({
  sedes,
  managers,
}: {
  sedes: Sede[];
  managers: Manager[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      documentType: "DNI",
      contractType: "INDEFINIDO",
      role: "EMPLEADO",
      requiresDriving: false,
      startDate: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = async (data: CreateEmployeeInput) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "No se pudo crear el empleado");
        setSubmitting(false);
        return;
      }
      if (json.warning) {
        alert(json.warning);
      }
      router.push("/empleados");
      router.refresh();
    } catch (err) {
      console.error(err);
      setServerError("Error de red. Vuelve a intentarlo.");
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white rounded-xl border border-slate-200 p-6 space-y-6"
    >
      {serverError && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <Section title="Datos personales">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombres" error={errors.nombres?.message} required>
            <input type="text" {...register("nombres")} className={inputCls} />
          </Field>
          <Field label="Apellidos" error={errors.apellidos?.message} required>
            <input type="text" {...register("apellidos")} className={inputCls} />
          </Field>
          <Field label="Tipo de documento" error={errors.documentType?.message} required>
            <select {...register("documentType")} className={inputCls}>
              <option value="DNI">DNI</option>
              <option value="TIE">TIE / NIE</option>
              <option value="PASAPORTE">Pasaporte</option>
            </select>
          </Field>
          <Field label="Nº documento" error={errors.documentNumber?.message} required>
            <input type="text" {...register("documentNumber")} className={inputCls} />
          </Field>
          <Field label="Email" error={errors.email?.message} required hint="Se usará para enviar la invitación">
            <input type="email" {...register("email")} className={inputCls} />
          </Field>
          <Field label="Teléfono" error={errors.phone?.message}>
            <input type="tel" {...register("phone")} className={inputCls} />
          </Field>
        </div>
      </Section>

      <Section title="Datos laborales">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Sede" error={errors.sedeId?.message} required>
            <select {...register("sedeId")} className={inputCls} defaultValue="">
              <option value="" disabled>Selecciona una sede</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Cargo" error={errors.position?.message} required>
            <input type="text" {...register("position")} className={inputCls} placeholder="Ej: Técnico comercial" />
          </Field>
          <Field label="Departamento" error={errors.department?.message}>
            <input type="text" {...register("department")} className={inputCls} placeholder="Ej: Comercial" />
          </Field>
          <Field label="Jefe directo" error={errors.reportsToId?.message}>
            <select {...register("reportsToId")} className={inputCls} defaultValue="">
              <option value="">Sin asignar</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.apellidos}, {m.nombres}{m.position ? ` — ${m.position}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de contrato" error={errors.contractType?.message} required>
            <select {...register("contractType")} className={inputCls}>
              <option value="INDEFINIDO">Indefinido</option>
              <option value="TEMPORAL">Temporal</option>
              <option value="FORMACION">Formación</option>
              <option value="PRACTICAS">Prácticas</option>
            </select>
          </Field>
          <Field label="Fecha de alta" error={errors.startDate?.message} required>
            <input type="date" {...register("startDate")} className={inputCls} />
          </Field>
          <Field label="Nº Seguridad Social (NAF)" error={errors.socialSecurityNumber?.message} hint="Opcional — lo puede completar el trabajador">
            <input type="text" {...register("socialSecurityNumber")} className={inputCls} placeholder="12/12345678/90" />
          </Field>
          <Field label="Rol en la app" error={errors.role?.message} required>
            <select {...register("role")} className={inputCls}>
              <option value="EMPLEADO">Empleado</option>
              <option value="MANAGER">Manager</option>
              <option value="RRHH">RRHH</option>
            </select>
          </Field>
        </div>

        <label className="flex items-center gap-2 mt-4 text-sm text-slate-700 cursor-pointer select-none">
          <input type="checkbox" {...register("requiresDriving")} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
          Este empleado conduce vehículos de la empresa (se pedirá permiso de conducir y CAP)
        </label>
      </Section>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => router.push("/empleados")}
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Crear y enviar invitación
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-slate-50";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-800 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
      {!error && hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
