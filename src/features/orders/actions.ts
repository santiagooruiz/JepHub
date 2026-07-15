"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { enqueueSend } from "@/server/queue/ofimatica";
import { sendMail } from "@/server/mail";
import {
  fetchPedidoNumero,
  fetchErpMilestones,
  isErpDbConfigured,
} from "@/server/ofimatica/client";
import { applyMilestone } from "@/server/ofimatica/milestones";
import { HITOS } from "@/server/ofimatica/types";
import { buildOrderEmail } from "./order-email";
import type { ActionResult } from "@/features/config/actions";
import { ORDER_ESTADOS, APPROVAL_KINDS } from "./types";

/**
 * Genera un pedido a partir de una cotización APROBADA (copia ítems) y envía
 * un correo (ORDER_NOTIFY_EMAIL) con la información de la cotización para
 * ingresarla en el ERP. Medida transitoria: cuando se active la inserción
 * automática de la CV vía stored procedures (docs/INTEGRACION-OFIMATICA.md),
 * este correo se reemplaza por el encolado del job `send`.
 */
export async function generateOrderFromQuote(
  quoteId: string
): Promise<
  | { ok: true; id: string; mail?: "ENVIADO" | "ERROR" }
  | { ok: false; error: string }
> {
  const user = await requirePermission("create", "orders");

  const q = await db.quote.findFirst({
    where: { id: quoteId, companyId: user.companyId, deletedAt: null },
    include: {
      items: true,
      order: { select: { id: true } },
      client: {
        select: {
          personType: true,
          razonSocial: true,
          nombreComercial: true,
          nombres: true,
          apellidos: true,
          numeroDocumento: true,
          telefono: true,
          email: true,
        },
      },
      registeredBy: { select: { name: true } },
    },
  });
  if (!q) return { ok: false, error: "Cotización no encontrada." };
  if (q.order) return { ok: true, id: q.order.id };
  if (q.estado !== "Aprobada") {
    return { ok: false, error: "La cotización debe estar Aprobada." };
  }

  const last = await db.order.findFirst({
    where: { companyId: user.companyId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });

  const order = await db.order.create({
    data: {
      companyId: user.companyId,
      numero: (last?.numero ?? 0) + 1,
      clientId: q.clientId,
      opportunityId: q.opportunityId,
      quoteId: q.id,
      advisorId: q.registeredById,
      formaPago: q.formaPago,
      direccionEnvio: q.direccionEnvio,
      subtotal: q.subtotal,
      impuesto: q.impuesto,
      total: q.total,
      items: {
        create: q.items.map((it) => ({
          productId: it.productId,
          imagen: it.imagen,
          referencia: it.referencia,
          descripcion: it.descripcion,
          precio: it.precio,
          cantidad: it.cantidad,
          descuentoPct: it.descuentoPct,
          precioConDesc: it.precioConDesc,
          acabados: it.acabados,
          observacionesInternas: it.observacionesInternas,
          total: it.total,
        })),
      },
      approvals: { create: APPROVAL_KINDS.map((kind) => ({ kind })) },
      erpSync: { create: {} },
    },
  });

  // Correo con los datos de la cotización para ingresarla en el ERP. Si el
  // envío falla, el pedido igual queda creado y se avisa en el toast.
  const clienteNombre =
    q.client.personType === "JURIDICA"
      ? q.client.razonSocial || q.client.nombreComercial || ""
      : [q.client.nombres, q.client.apellidos].filter(Boolean).join(" ");
  let mail: "ENVIADO" | "ERROR";
  try {
    const { subject, html } = buildOrderEmail({
      pedidoNumero: order.numero,
      pedidoId: order.id,
      quoteNumero: q.numero,
      clienteNombre,
      nit: q.client.numeroDocumento,
      telefono: q.client.telefono,
      emailCliente: q.client.email,
      asesor: q.registeredBy?.name ?? null,
      formaPago: q.formaPago,
      direccionEnvio: q.direccionEnvio,
      ordenCompra: q.ordenCompra,
      items: q.items.map((it) => ({
        referencia: it.referencia,
        descripcion: it.descripcion,
        acabados: it.acabados,
        cantidad: it.cantidad,
        precio: Number(it.precio),
        descuentoPct: Number(it.descuentoPct),
        total: Number(it.total),
      })),
      subtotal: Number(q.subtotal),
      impuesto: Number(q.impuesto),
      total: Number(q.total),
    });
    await sendMail({
      to: process.env.ORDER_NOTIFY_EMAIL || "auxsistemas@jepmobiliari.com",
      subject,
      html,
    });
    mail = "ENVIADO";
  } catch (err) {
    console.error("[orders] fallo el correo de ingreso a ofimática:", err);
    mail = "ERROR";
  }

  revalidatePath("/pedidos");
  revalidatePath(`/cotizaciones/${quoteId}`);
  return { ok: true, id: order.id, mail };
}

/**
 * Vincula el pedido del CRM con su COTIZACIÓN (CV) en el ERP: guarda el NRODCTO
 * de la CV (el número que el ERP asigna al ingresar la cotización, p. ej. 46157).
 * Con ese número el polling/consulta resuelve el PEDIDO (PD) y sus hitos. Deja el
 * ErpSync en "ENVIADO" para que el polling lo tome. Ver docs/INTEGRACION-OFIMATICA.md.
 */
export async function linkErpCotizacion(
  orderId: string,
  cvNumero: string
): Promise<ActionResult> {
  const user = await requirePermission("send_ofimatica", "orders");
  const cv = cvNumero.trim();
  if (!/^\d+$/.test(cv)) {
    return { ok: false, error: "El N° de cotización (CV) debe ser numérico." };
  }
  const order = await db.order.findFirst({
    where: { id: orderId, companyId: user.companyId },
    select: { id: true },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado." };

  await db.erpSync.upsert({
    where: { orderId },
    create: {
      orderId,
      nPedidoOfimatica: cv,
      estadoEnvio: "ENVIADO",
      fechaEnvio: new Date(),
    },
    update: {
      nPedidoOfimatica: cv,
      estadoEnvio: "ENVIADO",
      fechaEnvio: new Date(),
      ultimoError: null,
    },
  });
  revalidatePath(`/pedidos/${orderId}`);
  return { ok: true };
}

/**
 * Consulta el ERP para el pedido: resuelve el PEDIDO (PD) generado a partir de la
 * CV vinculada (TRADE.TIPODCTOPC='CV' AND NROSOLI=<CV>), guarda su NRODCTO y
 * aplica los hitos de producción (TRADEMAS). Actualiza el estado del pedido de
 * forma informativa (los procesos se gestionan en el ERP, no en JEP-Hub).
 */
export async function refreshErpStatus(
  orderId: string
): Promise<{ ok: true; pd: string | null } | { ok: false; error: string }> {
  const user = await requirePermission("send_ofimatica", "orders");
  const order = await db.order.findFirst({
    where: { id: orderId, companyId: user.companyId },
    select: {
      id: true,
      estado: true,
      erpSync: { select: { nPedidoOfimatica: true } },
    },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  const cv = order.erpSync?.nPedidoOfimatica?.trim();
  if (!cv || !/^\d+$/.test(cv)) {
    return {
      ok: false,
      error: "El pedido no tiene N° de cotización (CV) de ofimática. Vincúlalo primero.",
    };
  }
  if (!isErpDbConfigured()) {
    return { ok: false, error: "La BD del ERP (ofimática) no está configurada." };
  }

  try {
    const pd = await fetchPedidoNumero(cv);
    if (!pd) {
      // La CV aún no fue convertida en pedido por el ERP.
      revalidatePath(`/pedidos/${orderId}`);
      return { ok: true, pd: null };
    }
    await db.erpSync.update({ where: { orderId }, data: { nroPedidoErp: pd } });

    // Avanza el estado a "En Producción" cuando el ERP ya generó el pedido.
    await db.order.updateMany({
      where: { id: orderId, estado: "Pendiente Ingreso" },
      data: { estado: "En Producción" },
    });

    // Hitos de producción (Tapicería/Listo/Despacho): applyMilestone registra la
    // fecha, avanza el estado en "despacho" y notifica.
    const milestones = await fetchErpMilestones(pd);
    if (milestones) {
      for (const hito of HITOS) {
        const fecha = milestones[hito];
        if (fecha) await applyMilestone(orderId, hito, fecha.toISOString());
      }
    }
    revalidatePath(`/pedidos/${orderId}`);
    revalidatePath("/pedidos");
    return { ok: true, pd };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error consultando ofimática.",
    };
  }
}

/**
 * Encola el envío del pedido al ERP "ofimática". El worker BullMQ hace el envío
 * real (mock) y programa los hitos (tapicería/listo/despacho), que llegan por el
 * webhook. La integración es asíncrona: aquí solo se valida y encola.
 */
export async function sendToOfimatica(orderId: string): Promise<ActionResult> {
  const user = await requirePermission("send_ofimatica", "orders");
  const order = await db.order.findFirst({
    where: { id: orderId, companyId: user.companyId },
    select: { id: true, erpSync: { select: { estadoEnvio: true } } },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (order.erpSync?.estadoEnvio === "ENVIADO") {
    return { ok: false, error: "El pedido ya fue enviado a ofimática." };
  }

  try {
    await db.erpSync.upsert({
      where: { orderId },
      create: { orderId, estadoEnvio: "ENCOLADO" },
      update: { estadoEnvio: "ENCOLADO", ultimoError: null },
    });
    await enqueueSend(orderId);
  } catch {
    await db.erpSync.updateMany({
      where: { orderId },
      data: { estadoEnvio: "ERROR", ultimoError: "No se pudo encolar el envío." },
    });
    return { ok: false, error: "No se pudo encolar el envío. ¿Está Redis activo?" };
  }

  revalidatePath(`/pedidos/${orderId}`);
  revalidatePath("/pedidos");
  return { ok: true };
}

export async function updateOrderState(
  id: string,
  estado: string
): Promise<ActionResult> {
  const user = await requirePermission("edit", "orders");
  if (!ORDER_ESTADOS.includes(estado)) {
    return { ok: false, error: "Estado inválido." };
  }
  await db.order.updateMany({
    where: { id, companyId: user.companyId },
    data: { estado },
  });
  revalidatePath(`/pedidos/${id}`);
  revalidatePath("/pedidos");
  return { ok: true };
}

export async function deleteOrder(id: string): Promise<ActionResult> {
  const user = await requirePermission("delete", "orders");
  await db.order.updateMany({
    where: { id, companyId: user.companyId },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/pedidos");
  return { ok: true };
}
