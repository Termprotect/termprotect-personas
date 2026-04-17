import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.warn("[email] RESEND_API_KEY no está configurada. Los emails no se enviarán.");
}

export const resend = apiKey ? new Resend(apiKey) : null;

// Remitente por defecto. Cambiar a "RRHH Termprotect <rrhh@termprotect.es>"
// cuando el dominio esté verificado en Resend.
export const DEFAULT_FROM = "Termprotect <onboarding@resend.dev>";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (!resend) {
    console.log("[email] Envío omitido (sin API key):", params.subject, "→", params.to);
    return { skipped: true as const };
  }
  const { data, error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
  if (error) {
    console.error("[email] Error al enviar:", error);
    throw new Error(error.message);
  }
  return { id: data?.id };
}
