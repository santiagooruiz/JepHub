import { db } from "../../lib/db";
import { fetchErpMilestones, getErpClient, isErpDbConfigured } from "./client";
import { HITOS, type Hito } from "./types";
import { applyMilestone, notify } from "./milestones";
import { enqueueMilestone } from "../queue/ofimatica";

function mockDelays(): number[] {
  const raw = process.env.OFIMATICA_MOCK_DELAYS || "10000,20000,30000";
  const parts = raw.split(",").map((s) => Number(s.trim()));
  return HITOS.map((_, i) => (Number.isFinite(parts[i]) ? parts[i] : (i + 1) * 10000));
}

/** Job `send`: envía el pedido al ERP y deja lista la recepción de hitos. */
export async function processSend(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      numero: true,
      companyId: true,
      advisorId: true,
      subtotal: true,
      impuesto: true,
      total: true,
      ordenCompra: true,
      direccionEnvio: true,
      quote: { select: { numero: true } },
      advisor: { select: { codven: true } },
      client: {
        select: {
          numeroDocumento: true,
          personType: true,
          razonSocial: true,
          nombreComercial: true,
          nombres: true,
          apellidos: true,
        },
      },
      items: {
        select: { referencia: true, descripcion: true, cantidad: true, precio: true, total: true },
      },
    },
  });
  if (!order) throw new Error(`Pedido ${orderId} no encontrado`);

  const clientName =
    order.client.personType === "JURIDICA"
      ? order.client.razonSocial || order.client.nombreComercial
      : [order.client.nombres, order.client.apellidos].filter(Boolean).join(" ");

  try {
    const erp = getErpClient();
    const result = await erp.sendOrder({
      id: order.id,
      numero: order.numero,
      quoteNumero: order.quote?.numero ?? null,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      impuesto: Number(order.impuesto),
      nit: order.client.numeroDocumento,
      clientName,
      codven: order.advisor?.codven ?? null,
      ordenCompra: order.ordenCompra,
      direccionEnvio: order.direccionEnvio,
      items: order.items.map((it) => ({
        referencia: it.referencia,
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        precio: Number(it.precio),
        total: Number(it.total),
      })),
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

    // Con ERP real los hitos llegan por polling a TRADEMAS; el mock los simula.
    if (!isErpDbConfigured()) {
      const delays = mockDelays();
      await Promise.all(HITOS.map((hito, i) => enqueueMilestone(orderId, hito, delays[i])));
    }
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

/**
 * Job `poll` (repetitivo): revisa en TRADEMAS los hitos de los pedidos ya
 * enviados al ERP y aplica los nuevos con el mismo camino que el webhook.
 */
export async function processPoll(): Promise<void> {
  if (!isErpDbConfigured()) return;

  const pending = await db.erpSync.findMany({
    where: {
      estadoEnvio: "ENVIADO",
      nPedidoOfimatica: { not: null },
      fechaDespacho: null,
    },
    select: {
      orderId: true,
      nPedidoOfimatica: true,
      fechaTapiceria: true,
      fechaListo: true,
      fechaDespacho: true,
    },
  });

  for (const sync of pending) {
    // Los pedidos enviados con el cliente mock ("OF-…") no existen en el ERP.
    if (!/^\d+$/.test(sync.nPedidoOfimatica!.trim())) continue;

    const milestones = await fetchErpMilestones(sync.nPedidoOfimatica!);
    if (!milestones) continue;

    const registrado: Record<Hito, Date | null> = {
      tapiceria: sync.fechaTapiceria,
      listo: sync.fechaListo,
      despacho: sync.fechaDespacho,
    };
    for (const hito of HITOS) {
      const fecha = milestones[hito];
      if (fecha && !registrado[hito]) {
        await applyMilestone(sync.orderId, hito, fecha.toISOString());
      }
    }
  }
}
