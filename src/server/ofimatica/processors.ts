import { db } from "../../lib/db";
import {
  fetchErpMilestones,
  fetchPedidoNumeros,
  getErpClient,
  isErpDbConfigured,
} from "./client";
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
        select: {
          tipo: true,
          referencia: true,
          descripcion: true,
          cantidad: true,
          precio: true,
          total: true,
          observacionesInternas: true,
        },
      },
    },
  });
  if (!order) throw new Error(`Pedido ${orderId} no encontrado`);

  const clientName =
    order.client.personType === "JURIDICA"
      ? order.client.razonSocial || order.client.nombreComercial
      : [order.client.nombres, order.client.apellidos].filter(Boolean).join(" ");

  try {
    // El ERP crea una COTIZACIÓN 'CV' (nunca 'PD'/'PX'); el vendedor lo deriva
    // el SP del maestro MTPROCLI por NIT, no se envía desde JEP-Hub.
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
      ordenCompra: order.ordenCompra,
      direccionEnvio: order.direccionEnvio,
      // Las carátulas no viajan al ERP (sin código en MTMERCIA): solo productos.
      items: order.items
        .filter((it) => it.tipo === "PRODUCTO")
        .map((it) => ({
          referencia: it.referencia,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          precio: Number(it.precio),
          total: Number(it.total),
          nota: it.observacionesInternas,
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
      `Cotización N° ${result.nPedidoOfimatica} creada en el ERP`,
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
 * Job `poll` (repetitivo): resuelve el PEDIDO (PD) que el ERP generó desde
 * nuestra cotización (CV) y aplica los hitos nuevos (ZFTAPI/ZFLISTO/ZFDESPA de
 * TRADEMAS) por el mismo camino que el webhook. Enlace: PD.TIPODCTOPC='CV' y
 * PD.NROSOLI = NRODCTO de la CV. Ver docs/INTEGRACION-OFIMATICA.md.
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
      nroPedidoErp: true,
      fechaTapiceria: true,
      fechaListo: true,
      fechaDespacho: true,
    },
  });

  // Documentos reales (los del mock son "CV-…"). Resuelve todos los PD de una vez.
  const cvNros = pending
    .map((s) => s.nPedidoOfimatica!.trim())
    .filter((n) => /^\d+$/.test(n));
  const pdPorCv = await fetchPedidoNumeros(cvNros);

  for (const sync of pending) {
    // La CV aún puede no estar convertida en pedido: sin PD no hay hitos.
    const pedidoNro = pdPorCv.get(sync.nPedidoOfimatica!.trim());
    if (!pedidoNro) continue;

    // Guarda el N° de pedido (PD) y avanza el estado al haberse generado.
    if (sync.nroPedidoErp !== pedidoNro) {
      await db.erpSync.update({ where: { orderId: sync.orderId }, data: { nroPedidoErp: pedidoNro } });
      await db.order.updateMany({
        where: { id: sync.orderId, estado: "Pendiente Ingreso" },
        data: { estado: "En Producción" },
      });
    }

    const milestones = await fetchErpMilestones(pedidoNro);
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
