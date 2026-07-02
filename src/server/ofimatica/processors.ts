import { db } from "../../lib/db";
import { getErpClient } from "./client";
import { HITOS, type Hito } from "./types";
import { notify } from "./milestones";
import { enqueueMilestone } from "../queue/ofimatica";

function mockDelays(): number[] {
  const raw = process.env.OFIMATICA_MOCK_DELAYS || "10000,20000,30000";
  const parts = raw.split(",").map((s) => Number(s.trim()));
  return HITOS.map((_, i) => (Number.isFinite(parts[i]) ? parts[i] : (i + 1) * 10000));
}

/** Job `send`: envía el pedido al ERP y programa los hitos simulados. */
export async function processSend(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      numero: true,
      companyId: true,
      advisorId: true,
      total: true,
      quote: { select: { numero: true } },
    },
  });
  if (!order) throw new Error(`Pedido ${orderId} no encontrado`);

  try {
    const erp = getErpClient();
    const result = await erp.sendOrder({
      id: order.id,
      numero: order.numero,
      quoteNumero: order.quote?.numero ?? null,
      total: Number(order.total),
    });

    await db.erpSync.upsert({
      where: { orderId },
      create: {
        orderId,
        estadoEnvio: "ENVIADO",
        nPedidoOfimatica: result.nPedidoOfimatica,
        identificadorCotizacion: result.identificadorCotizacion,
        fechaEnvio: new Date(),
        fechaCreacion: new Date(result.fechaCreacion),
        intentos: 1,
      },
      update: {
        estadoEnvio: "ENVIADO",
        nPedidoOfimatica: result.nPedidoOfimatica,
        identificadorCotizacion: result.identificadorCotizacion,
        fechaEnvio: new Date(),
        fechaCreacion: new Date(result.fechaCreacion),
        ultimoError: null,
        intentos: { increment: 1 },
      },
    });
    await db.order.update({ where: { id: orderId }, data: { estado: "En Producción" } });

    await notify(
      order.companyId,
      order.advisorId,
      `Pedido N° ${order.numero} enviado a ofimática`,
      `N° ERP ${result.nPedidoOfimatica}`,
      `/pedidos/${orderId}`
    );

    // Programa los hitos simulados (el worker los reenviará al webhook).
    const delays = mockDelays();
    await Promise.all(HITOS.map((hito, i) => enqueueMilestone(orderId, hito, delays[i])));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    await db.erpSync.upsert({
      where: { orderId },
      create: { orderId, estadoEnvio: "ERROR", ultimoError: message, intentos: 1 },
      update: { estadoEnvio: "ERROR", ultimoError: message, intentos: { increment: 1 } },
    });
    throw err; // BullMQ reintenta según attempts/backoff.
  }
}

/**
 * Job `milestone`: simula que el ERP notifica un hito, reenviándolo al webhook
 * de la app (mismo camino de recepción que usaría el ERP real).
 */
export async function processMilestone(orderId: string, hito: Hito): Promise<void> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const secret = process.env.OFIMATICA_WEBHOOK_SECRET || "";
  const res = await fetch(`${appUrl}/api/ofimatica/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-ofimatica-secret": secret },
    body: JSON.stringify({ orderId, hito, fecha: new Date().toISOString() }),
  });
  if (!res.ok) {
    throw new Error(`Webhook respondió ${res.status} para hito ${hito}`);
  }
}
