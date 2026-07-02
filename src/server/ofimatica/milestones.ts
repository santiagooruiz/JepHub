import { db } from "../../lib/db";
import { HITO_FIELD, HITO_LABEL, type Hito } from "./types";

/** Crea una notificación in-app. */
export async function notify(
  companyId: string,
  userId: string | null,
  titulo: string,
  cuerpo: string,
  href: string
) {
  await db.notification.create({
    data: { companyId, userId, tipo: "ofimatica", titulo, cuerpo, href },
  });
}

/**
 * Aplica un hito recibido del ERP (webhook): registra la fecha, avanza el estado
 * del pedido en "despacho" y notifica. Camino de recepción compartido por el ERP
 * real y por el simulador (worker). Devuelve false si el pedido no existe.
 */
export async function applyMilestone(orderId: string, hito: Hito, fechaISO?: string): Promise<boolean> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, numero: true, companyId: true, advisorId: true, requiereInstalacion: true },
  });
  if (!order) return false;

  const fecha = fechaISO ? new Date(fechaISO) : new Date();
  await db.erpSync.update({ where: { orderId }, data: { [HITO_FIELD[hito]]: fecha } });

  if (hito === "despacho") {
    await db.order.update({
      where: { id: orderId },
      data: { estado: order.requiereInstalacion ? "Instalación" : "Pendientes Facturación" },
    });
  }

  await notify(
    order.companyId,
    order.advisorId,
    `Pedido N° ${order.numero}: hito ${HITO_LABEL[hito]}`,
    `Registrado el ${fecha.toLocaleString("es-CO")}`,
    `/pedidos/${orderId}`
  );
  return true;
}
