export function invitationEmail(params: {
  nombres: string;
  apellidos: string;
  activationUrl: string;
  expiresInDays: number;
}) {
  const { nombres, apellidos, activationUrl, expiresInDays } = params;

  const subject = "Bienvenido/a a Termprotect — Completa tu alta";

  const text = `Hola ${nombres},

Recursos Humanos de Termprotect te ha dado de alta en la aplicación de gestión de personas. Para completar tu perfil, activar tu cuenta y firmar la cláusula de protección de datos, entra en el siguiente enlace:

${activationUrl}

Este enlace caduca en ${expiresInDays} días. Si no lo utilizas a tiempo, tendrás que solicitar una nueva invitación a RRHH.

Un saludo,
Recursos Humanos — Termprotect
`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:#1e40af;padding:24px 32px;color:#ffffff;">
              <h1 style="margin:0;font-size:20px;font-weight:600;letter-spacing:-0.01em;">Termprotect</h1>
              <p style="margin:4px 0 0;font-size:13px;opacity:0.8;">Gestión de personas</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#0f172a;">Hola ${nombres} ${apellidos},</h2>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">
                Recursos Humanos te ha dado de alta en la aplicación de gestión de personas de Termprotect.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#334155;">
                Para completar tu perfil, crear tu contraseña y firmar la cláusula de protección de datos, pulsa el siguiente botón:
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td align="center" style="border-radius:8px;background:#1e40af;">
                    <a href="${activationUrl}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Completar mi alta
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#64748b;">
                Si el botón no funciona, copia este enlace en tu navegador:
              </p>
              <p style="margin:0 0 24px;font-size:12px;line-height:1.5;color:#1e40af;word-break:break-all;">
                ${activationUrl}
              </p>
              <div style="padding:12px 16px;background:#fef3c7;border-radius:8px;margin-bottom:16px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#92400e;">
                  <strong>Importante:</strong> este enlace caduca en ${expiresInDays} días. Si no lo utilizas a tiempo, tendrás que solicitar una nueva invitación a RRHH.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                Recursos Humanos — Termprotect · ${new Date().getFullYear()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
