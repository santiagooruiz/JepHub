// Notificación (in-app + correo) a los diseñadores cuando entra una solicitud
// nueva de "Solicitar planos/cambios" (origen cotización). Correo de respaldo
// a DESIGN_NOTIFY_EMAIL, siguiendo el mismo patrón que el correo de ingreso a
// ofimática en src/features/orders/actions.ts (nunca bloquea la acción).

import { db } from "@/lib/db";
import { sendMail } from "@/server/mail";

function esc(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Diseñadores activos de la empresa (rol Diseñador / Diseñador Comercial). */
export async function getActiveDesigners(
  companyId: string
): Promise<{ id: string }[]> {
  return db.user.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      role: { name: { in: ["Diseñador", "Diseñador Comercial"] } },
    },
    select: { id: true },
  });
}

export async function notifyDesignersNewRequest(args: {
  companyId: string;
  designRequestId: string;
  numero: number;
  descripcion: string | null;
  clienteNombre: string | null;
  asesorNombre: string | null;
  cambio?: boolean;
}): Promise<void> {
  const { companyId, designRequestId, numero, descripcion, clienteNombre, asesorNombre, cambio } =
    args;

  const disenadores = await getActiveDesigners(companyId);
  const titulo = cambio
    ? `Solicitud de cambio (Diseño N°${numero})`
    : `Nueva solicitud de plano/ficha comercial (Diseño N°${numero})`;
  if (disenadores.length) {
    await db.notification.createMany({
      data: disenadores.map((u) => ({
        companyId,
        userId: u.id,
        tipo: "diseño",
        titulo,
        cuerpo: descripcion || undefined,
        href: `/backlog/${designRequestId}`,
      })),
    });
  }

  try {
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const subject = titulo;
    const html = `
      <p>${esc(titulo)}.</p>
      <ul>
        <li><strong>Cliente:</strong> ${esc(clienteNombre) || "—"}</li>
        <li><strong>Asesor:</strong> ${esc(asesorNombre) || "—"}</li>
        <li><strong>Descripción:</strong> ${esc(descripcion) || "—"}</li>
      </ul>
      <p><a href="${appUrl}/backlog/${designRequestId}">Ver la solicitud en el CRM</a></p>
    `;
    await sendMail({
      to: process.env.DESIGN_NOTIFY_EMAIL || "auxsistemas@jepmobiliari.com",
      subject,
      html,
    });
  } catch (err) {
    console.error("[design] fallo el correo de aviso a diseño:", err);
  }
}
