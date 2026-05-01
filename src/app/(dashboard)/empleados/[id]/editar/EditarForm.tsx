"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  updateEmployeeSchema,
  type UpdateEmployeeInput,
} from "@/lib/validators/employee-update";

type Sede = { id: string; name: string };
type Manager = {
  id: string;
  nombres: string;
  apellidos: string;
  position: string | null;
};

type InitialValues = {
  nombres: string;
  apellidos: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  sedeId: string;
  position: string;
  department: string;
  reportsToId: string;
  contractType: "INDEFINIDO" | "TEMPORAL" | "FORMACION" | "PRACTICAS";
  workMode: "PRESENCIAL" | "TELETRABAJO" | "HIBRIDO";
  startDate: string;
  endDate: string;
  socialSecurityNumber: string;
  role: "EMPLEADO" | "MANAGER" | "RRHH" | "ADMIN";
  requiresDriving: boolean;
  bankAccountHolder: string;
  iban: string;
  drivingLicenseNumber: string;
  drivingLicenseCategory: string;
  drivingLicenseExpiresAt: string;
};

export default function EditarForm({
  employeeId,
  sedes,
  managers,
  initialValues,
}: {
  employeeId: string;
  sedes: Sede[];
  managers: Manager[];
  initialValues: InitialValues;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<UpdateEmployeeInput>({
    // Cast necesario porque el schema usa preprocess/transform:
    // el input del form (strings) no coincide tipo-a-tipo con el output parseado.
    resolver: zodResolver(updateEmployeeSchema) as unknown as Resolver<UpdateEmployeeInput>,
    defaultValues: initialValues as unknown as UpdateEmployeeInput,
  });

  const contractType = watch("contractType");
  const requiresDriving = watch("requiresDriving");

  const onSubmit = async (data: UpdateEmployeeInput) => {
    setSubmitting(true);
    setServerError(null);
    setOkMsg(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        // Si el backend devuelve detalles de Zod, los listamos campo a campo
        if (json.details?.fieldErrors) {
          const fieldErrs = json.details.fieldErrors as Record<string, string[]>;
          const msgs = Object.entries(fieldErrs)
            .map(([field, errs]) => `${fieldLabel(field)}: ${errs.join(", ")}`)
            .join(" · ");
          setServerError(msgs || json.error || "Datos no válidos");
        } else {
          setServerError(json.error ?? "No se pudo guardar");
        }
        setSubmitting(false);
        return;
      }
      setOkMsg(
        json.trackedChanges > 0
          ? `Cambios guardados. ${json.trackedChanges} cambio${json.trackedChanges === 1 ? "" : "s"} laboral${json.trackedChanges === 1 ? "" : "es"} registrado${json.trackedChanges === 1 ? "" : "s"} en el historial.`
          : "Cambios guardados."
      );
      setSubmitting(false);
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
      className="bg-background rounded-xl border border-border p-6 space-y-6"
    >
      {serverError && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}
      {okMsg && (
        <div className="flex items-start gap-2 p-3 bg-success/10 border border-success/20 rounded-lg text-success text-sm">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{okMsg}</span>
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
          <Field label="Email" error={errors.email?.message}>
            <input type="email" {...register("email")} className={inputCls} />
          </Field>
          <Field label="Teléfono" error={errors.phone?.message}>
            <input type="tel" {...register("phone")} className={inputCls} />
          </Field>
          <Field label="Fecha de nacimiento" error={errors.birthDate?.message}>
            <input type="date" {...register("birthDate")} className={inputCls} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Dirección" error={errors.address?.message}>
              <input type="text" {...register("address")} className={inputCls} />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Datos laborales" hint="Los cambios quedan registrados en el historial">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Sede" error={errors.sedeId?.message} required>
            <select {...register("sedeId")} className={inputCls}>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cargo" error={errors.position?.message} required>
            <input type="text" {...register("position")} className={inputCls} />
          </Field>
          <Field label="Departamento" error={errors.department?.message}>
            <input type="text" {...register("department")} className={inputCls} />
          </Field>
          <Field label="Jefe directo" error={errors.reportsToId?.message}>
            <select {...register("reportsToId")} className={inputCls}>
              <option value="">Sin asignar</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.apellidos}, {m.nombres}
                  {m.position ? ` — ${m.position}` : ""}
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
          <Field label="Modalidad" error={errors.workMode?.message} required>
            <select {...register("workMode")} className={inputCls}>
              <option value="PRESENCIAL">Presencial</option>
              <option value="TELETRABAJO">Teletrabajo</option>
              <option value="HIBRIDO">Híbrido</option>
            </select>
          </Field>
          <Field label="Fecha de alta" error={errors.startDate?.message} required>
            <input type="date" {...register("startDate")} className={inputCls} />
          </Field>
          <Field
            label="Fin de contrato"
            error={errors.endDate?.message}
            hint={contractType === "TEMPORAL" ? "Obligatorio en temporal" : "Solo en temporal"}
          >
            <input
              type="date"
              {...register("endDate")}
              className={inputCls}
              disabled={contractType !== "TEMPORAL"}
            />
          </Field>
          <Field label="Nº Seguridad Social (NAF)" error={errors.socialSecurityNumber?.message}>
            <input type="text" {...register("socialSecurityNumber")} className={inputCls} />
          </Field>
          <Field label="Rol en la app" error={errors.role?.message} required>
            <select {...register("role")} className={inputCls}>
              <option value="EMPLEADO">Empleado</option>
              <option value="MANAGER">Manager</option>
              <option value="RRHH">RRHH</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </Field>
        </div>

        <label className="flex items-center gap-2 mt-4 text-sm text-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            {...register("requiresDriving")}
            className="w-4 h-4 rounded border-border text-primary"
          />
          Conduce vehículos de la empresa
        </label>
      </Section>

      <Section title="Datos bancarios">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Titular" error={errors.bankAccountHolder?.message}>
            <input type="text" {...register("bankAccountHolder")} className={inputCls} />
          </Field>
          <Field label="IBAN" error={errors.iban?.message} hint="ES + 22 dígitos">
            <input type="text" {...register("iban")} className={inputCls} />
          </Field>
        </div>
      </Section>

      {requiresDriving && (
        <Section title="Conducción">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nº permiso" error={errors.drivingLicenseNumber?.message}>
              <input type="text" {...register("drivingLicenseNumber")} className={inputCls} />
            </Field>
            <Field label="Categoría" error={errors.drivingLicenseCategory?.message}>
              <input type="text" {...register("drivingLicenseCategory")} className={inputCls} placeholder="B, C, C+E, D..." />
            </Field>
            <Field label="Caducidad permiso" error={errors.drivingLicenseExpiresAt?.message}>
              <input type="date" {...register("drivingLicenseExpiresAt")} className={inputCls} />
            </Field>
          </div>
        </Section>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => router.push(`/empleados/${employeeId}`)}
          className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting || !isDirty}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar cambios
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-background disabled:bg-secondary disabled:text-muted-foreground";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  nombres: "Nombres",
  apellidos: "Apellidos",
  email: "Email",
  phone: "Teléfono",
  address: "Dirección",
  birthDate: "Fecha de nacimiento",
  sedeId: "Sede",
  position: "Cargo",
  department: "Departamento",
  reportsToId: "Jefe directo",
  contractType: "Tipo de contrato",
  workMode: "Modalidad",
  startDate: "Fecha de alta",
  endDate: "Fin de contrato",
  socialSecurityNumber: "NAF",
  role: "Rol",
  requiresDriving: "Conduce vehículos",
  bankAccountHolder: "Titular banco",
  iban: "IBAN",
  drivingLicenseNumber: "Nº permiso",
  drivingLicenseCategory: "Categoría permiso",
  drivingLicenseExpiresAt: "Caducidad permiso",
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
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
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      {!error && hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
