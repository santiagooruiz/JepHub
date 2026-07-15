// Envío de correo por SMTP (nodemailer). Config por variables SMTP_* (ver
// .env.example); si SMTP_HOST no está definido, isMailConfigured() = false y
// el llamador decide cómo degradar (p. ej. avisar que falta configurar).
import nodemailer from "nodemailer";

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

function transporter() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 = TLS implícito; 587/25 = STARTTLS (secure:false deja negociar).
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "1" : port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!isMailConfigured()) {
    throw new Error("SMTP no configurado (falta SMTP_HOST en el entorno).");
  }
  await transporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
