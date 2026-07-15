import { db } from "../../lib/db";
import { fetchPedidoNumero, fetchErpMilestones, isErpDbConfigured } from "./client";
import { applyMilestone } from "./milestones";
import { HITOS } from "./types";

/**
 * Resuelve el estado de un pedido contra el ERP a partir de su CV vinculada:
 *   1. Busca el PEDIDO (PD) que el ERP generó (TRADE.TIPODCTOPC='CV' AND NROSOLI=<CV>).
 *   2. Guarda su NRODCTO en ErpSync.nroPedidoErp y avanza el estado ("Pendiente
 *      Ingreso" → "En Producción") cuando ya existe el PD.
 *   3. Aplica los hitos de producción NUEVOS (Tapicería/Listo/Despacho) — sin
 *      re-notificar los ya registrados.
 * Idempotente: se puede llamar en cada carga del pedido o desde el polling.
 * No lanza si el ERP no está configurado o no hay CV (devuelve el PD conocido).
 */
export async function resolveErpStatus(orderId: string): Promise<{ pd: string | null }> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      estado: true,
      erpSync: {
        select: {
          nPedidoOfimatica: true,
          nroPedidoErp: true,
          fechaTapiceria: true,
          fechaListo: true,
          fechaDespacho: true,
        },
      },
    },
  });
  if (!order?.erpSync) return { pd: null };

  const cv = order.erpSync.nPedidoOfimatica?.trim();
  if (!cv || !/^\d+$/.test(cv) || !isErpDbConfigured()) {
    return { pd: order.erpSync.nroPedidoErp ?? null };
  }

  const pd = await fetchPedidoNumero(cv);
  if (!pd) return { pd: null };

  if (order.erpSync.nroPedidoErp !== pd) {
    await db.erpSync.update({ where: { orderId }, data: { nroPedidoErp: pd } });
  }
  if (order.estado === "Pendiente Ingreso") {
    await db.order.updateMany({
      where: { id: orderId, estado: "Pendiente Ingreso" },
      data: { estado: "En Producción" },
    });
  }

  const milestones = await fetchErpMilestones(pd);
  if (milestones) {
    const registrado: Record<(typeof HITOS)[number], Date | null> = {
      tapiceria: order.erpSync.fechaTapiceria,
      listo: order.erpSync.fechaListo,
      despacho: order.erpSync.fechaDespacho,
    };
    for (const hito of HITOS) {
      const fecha = milestones[hito];
      if (fecha && !registrado[hito]) {
        await applyMilestone(orderId, hito, fecha.toISOString());
      }
    }
  }
  return { pd };
}
