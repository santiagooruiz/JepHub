"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import type { ActionResult } from "@/features/config/actions";
import {
  ORDER_ESTADOS,
  APPROVAL_KINDS,
  APPROVAL_PERM,
  type ApprovalKind,
} from "./types";

/** Genera un pedido a partir de una cotización APROBADA (copia ítems). */
export async function generateOrderFromQuote(
  quoteId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requirePermission("create", "orders");

  const q = await db.quote.findFirst({
    where: { id: quoteId, companyId: user.companyId, deletedAt: null },
    include: { items: true, order: { select: { id: true } } },
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

  revalidatePath("/pedidos");
  revalidatePath(`/cotizaciones/${quoteId}`);
  return { ok: true, id: order.id };
}

export async function approveOrderStep(
  orderId: string,
  kind: string,
  observacion?: string
): Promise<ActionResult> {
  if (!APPROVAL_KINDS.includes(kind as ApprovalKind)) {
    return { ok: false, error: "Tipo de aprobación inválido." };
  }
  const user = await requirePermission(
    APPROVAL_PERM[kind as ApprovalKind],
    "orders"
  );
  const order = await db.order.findFirst({
    where: { id: orderId, companyId: user.companyId },
    select: { id: true },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado." };

  await db.orderApproval.updateMany({
    where: { orderId, kind: kind as ApprovalKind },
    data: {
      aprobado: true,
      approvedById: user.id,
      observacion: observacion?.trim() || null,
      fecha: new Date(),
    },
  });
  revalidatePath(`/pedidos/${orderId}`);
  return { ok: true };
}

/** STUB de integración con "ofimática": simula el envío y fechas de producción. */
export async function sendToOfimatica(orderId: string): Promise<ActionResult> {
  const user = await requirePermission("send_ofimatica", "orders");
  const order = await db.order.findFirst({
    where: { id: orderId, companyId: user.companyId },
    select: { id: true, numero: true },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado." };

  const now = new Date();
  await db.erpSync.update({
    where: { orderId },
    data: {
      estadoEnvio: "ENVIADO",
      fechaEnvio: now,
      nPedidoOfimatica: `OF-${order.numero}${String(now.getFullYear()).slice(2)}`,
      fechaTapiceria: new Date(now.getTime() + 3 * 86400000),
      fechaListo: new Date(now.getTime() + 7 * 86400000),
      fechaDespacho: new Date(now.getTime() + 10 * 86400000),
    },
  });
  await db.order.update({
    where: { id: orderId },
    data: { estado: "En Producción" },
  });
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
