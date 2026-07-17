// Creación automática de solicitudes de diseño a partir de ítems ESPECIALES
// (referencia CODIGO-ESPECIAL) en una cotización: al guardarla, la solicitud
// entra al Backlog Diseño y se notifica a los diseñadores para que la revisen.
// Es una acción de sistema (no exige permiso backlog_design del asesor).

import { db } from "@/lib/db";

export type EspecialLinea = {
  descripcion: string | null;
  cantidad: number;
  imagen: string | null;
};

/**
 * Garantiza que la cotización tenga una solicitud en Backlog Diseño por sus
 * ítems ESPECIALES. Idempotente: si ya existe una solicitud activa para la
 * cotización, no crea otra (diseño ya la tiene en su cola).
 */
export async function ensureEspecialDesignRequest(args: {
  companyId: string;
  userId: string;
  quoteId: string;
  quoteNumero: number;
  clientId: string;
  especiales: EspecialLinea[];
}): Promise<void> {
  const { companyId, userId, quoteId, quoteNumero, clientId, especiales } = args;
  if (especiales.length === 0) return;

  const existing = await db.designRequest.findFirst({
    where: { quoteId, deletedAt: null },
    select: { id: true },
  });
  if (existing) return;

  const detalle = especiales
    .map((e) => `${e.descripcion?.trim() || "(sin descripción)"} × ${e.cantidad}`)
    .join(" · ");

  const last = await db.designRequest.findFirst({
    where: { companyId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const dr = await db.designRequest.create({
    data: {
      companyId,
      numero: (last?.numero ?? 0) + 1,
      quoteId,
      clientId,
      requestedById: userId,
      imagen: especiales.find((e) => e.imagen)?.imagen ?? null,
      descripcion: `Ítem ESPECIAL de la cotización N° ${quoteNumero}: ${detalle}`,
    },
  });

  await db.activity.createMany({
    data: [
      {
        companyId,
        entityType: "DESIGN",
        designRequestId: dr.id,
        accion: `Solicitud creada por ítem ESPECIAL en la cotización N° ${quoteNumero}`,
        fechaHora: new Date(),
        userId,
        auto: true,
      },
      {
        companyId,
        entityType: "QUOTE",
        quoteId,
        accion: "Ítem ESPECIAL enviado a revisión de diseño",
        fechaHora: new Date(),
        userId,
        auto: true,
      },
    ],
  });

  // Notificación in-app a los diseñadores activos de la empresa.
  const disenadores = await db.user.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      role: { name: { in: ["Diseñador", "Diseñador Comercial"] } },
    },
    select: { id: true },
  });
  if (disenadores.length) {
    await db.notification.createMany({
      data: disenadores.map((u) => ({
        companyId,
        userId: u.id,
        tipo: "sistema",
        titulo: `Ítem ESPECIAL para revisar (cotización N° ${quoteNumero})`,
        cuerpo: detalle,
        href: `/backlog/${dr.id}`,
      })),
    });
  }
}
