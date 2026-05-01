"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  activationSchema,
  type ActivationInput,
  CLAUSULA_TEXTO,
} from "@/lib/validators/activation";
import PhotoCapture from "./PhotoCapture";
import DocumentUpload, { type DocumentSlot } from "./DocumentUpload";

export default function ActivarForm({
  token,
  requiresDriving,
  documentType,
}: {
  token: string;
  requiresDriving: boolean;
  documentType: "DNI" | "TIE" | "PASAPORTE";
}) {
  const idSlots: DocumentSlot[] =
    documentType === "PASAPORTE"
      ? [{ kind: "PASAPORTE", label: "Pasaporte", description: "Página con foto", required: true }]
      : documentType === "TIE"
      ? [
          { kind: "TIE_ANVERSO", label: "TIE / NIE — anverso", required: true },
          { kind: "TIE_REVERSO", label: "TIE / NIE — reverso", required: true },
        ]
      : [
          { kind: "DNI_ANVERSO", label: "DNI — anverso", required: true },
          { kind: "DNI_REVERSO", label: "DNI — reverso", required: true },
        ];

  const bankSlot: DocumentSlot = {
    kind: "CERTIFICADO_BANCARIO",
    label: "Certificado de titularidad bancaria",
    description: "Documento del banco que acredite la titularidad del IBAN",
    required: true,
  };

  const drivingSlots: DocumentSlot[] = [
    { kind: "PERMISO_CONDUCIR", label: "Permiso de conducir", required: true },
  ];
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivationInput>({
    resolver: zodResolver(activationSchema),
    defaultValues: {
      emergencyRelation: "CONYUGE",
    },
  });

  const onSubmit = async (data: ActivationInput) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/activar/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "No se pudo completar la activación");
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      console.error(err);
      setServerError("Error de red. Vuelve a intentarlo.");
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-background rounded-xl border border-success/20 p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6 text-success" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Alta completada</h2>
        <p className="text-sm text-muted-foreground">
          Tu cuenta está activa. Redirigiendo al inicio de sesión...
        </p>
      </div>
    );
  }

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

      <Section title="Datos personales">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Fecha de nacimiento" error={errors.birthDate?.message} required>
            <input type="date" {...register("birthDate")} className={inputCls} />
          </Field>
          <Field label="Teléfono" error={errors.phone?.message} required>
            <input type="tel" {...register("phone")} className={inputCls} placeholder="6XX XXX XXX" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Dirección completa" error={errors.address?.message} required>
              <input type="text" {...register("address")} className={inputCls} placeholder="Calle, número, piso, CP, ciudad" />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Contacto de emergencia">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre y apellidos" error={errors.emergencyName?.message} required>
            <input type="text" {...register("emergencyName")} className={inputCls} />
          </Field>
          <Field label="Teléfono" error={errors.emergencyPhone?.message} required>
            <input type="tel" {...register("emergencyPhone")} className={inputCls} />
          </Field>
          <Field label="Relación" error={errors.emergencyRelation?.message} required>
            <select {...register("emergencyRelation")} className={inputCls}>
              <option value="CONYUGE">Cónyuge / pareja</option>
              <option value="PADRE_MADRE">Padre / madre</option>
              <option value="HERMANO_A">Hermano/a</option>
              <option value="HIJO_A">Hijo/a</option>
              <option value="OTRO">Otro</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Datos bancarios">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Titular de la cuenta" error={errors.bankAccountHolder?.message} required>
            <input type="text" {...register("bankAccountHolder")} className={inputCls} />
          </Field>
          <Field label="IBAN" error={errors.iban?.message} required hint="Formato: ES + 22 dígitos">
            <input type="text" {...register("iban")} className={inputCls} placeholder="ES00 0000 0000 0000 0000 0000" />
          </Field>
        </div>
      </Section>

      {requiresDriving && (
        <Section title="Permiso de conducir">
          <p className="text-xs text-muted-foreground mb-3">
            RRHH ha indicado que conduces vehículos de la empresa. Rellena estos campos.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nº permiso de conducir" error={errors.drivingLicenseNumber?.message}>
              <input type="text" {...register("drivingLicenseNumber")} className={inputCls} />
            </Field>
            <Field label="Categoría" error={errors.drivingLicenseCategory?.message} hint="B, C, C+E, D...">
              <input type="text" {...register("drivingLicenseCategory")} className={inputCls} />
            </Field>
            <Field label="Caducidad permiso" error={errors.drivingLicenseExpiresAt?.message}>
              <input type="date" {...register("drivingLicenseExpiresAt")} className={inputCls} />
            </Field>
          </div>
        </Section>
      )}

      <Section title="Foto de perfil">
        <PhotoCapture token={token} onUploaded={() => { /* foto ya persistida server-side */ }} />
      </Section>

      <Section title="Documento de identidad">
        <div className="space-y-2">
          {idSlots.map((s) => (
            <DocumentUpload key={s.kind} token={token} slot={s} />
          ))}
        </div>
      </Section>

      <Section title="Certificado bancario">
        <DocumentUpload token={token} slot={bankSlot} />
      </Section>

      {requiresDriving && (
        <Section title="Documentación de conducción">
          <div className="space-y-2">
            {drivingSlots.map((s) => (
              <DocumentUpload key={s.kind} token={token} slot={s} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Crea tu contraseña">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Contraseña" error={errors.password?.message} required hint="Mínimo 8 caracteres, 1 mayúscula y 1 número">
            <input type="password" {...register("password")} className={inputCls} />
          </Field>
          <Field label="Confirmar contraseña" error={errors.confirmPassword?.message} required>
            <input type="password" {...register("confirmPassword")} className={inputCls} />
          </Field>
        </div>
      </Section>

      <Section title="Cláusula de protección de datos">
        <div className="bg-secondary border border-border rounded-lg p-4 text-sm text-foreground leading-relaxed">
          {CLAUSULA_TEXTO}
        </div>
        <label className="flex items-start gap-2 mt-3 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            {...register("acceptClausula")}
            className="mt-0.5 w-4 h-4 rounded border-border text-primary"
          />
          <span>
            He leído y acepto la cláusula. Declaro que la información facilitada es veraz.
          </span>
        </label>
        {errors.acceptClausula && (
          <p className="text-xs text-destructive mt-1">{errors.acceptClausula.message}</p>
        )}
      </Section>

      <div className="flex items-center justify-end pt-2 border-t border-border">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Completar mi alta
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-background";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-3">{title}</h2>
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
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      {!error && hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
