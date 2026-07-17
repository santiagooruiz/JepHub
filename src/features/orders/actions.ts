"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { enqueueSend } from "@/server/queue/ofimatica";
import { sendMail } from "@/server/mail";
import { getErpClient, isErpDbConfigured } from "@/server/ofimatica/client";
import { resolveErpStatus } from "@/server/ofimatica/status";
import { clientDisplayName } from "@/features/clients/queries";
import {
  cloneLineItemRows,
  groupLineItems,
  insertLineItemRows,
  medidasToString,
  sumTotals,
} from "@/features/quotes/line-items";
import { buildOrderEmail } from "./order-email";
import type { ActionResult } from "@/features/config/actions";
import { ORDER_ESTADOS, APPROVAL_KINDS } from "./types";

/**
 * Inserta la COTIZACIÓN (CV) del pedido en el ERP (SQL Server) vía los stored
 * procedures (docs/INTEGRACION-OFIMATICA.md). Guarda el NRODCTO de la CV en
 * `ErpSync.nPedidoOfimatica` (ENVIADO) o el error (ERROR). No cambia el estado
 * del pedido: eso lo hace el seguimiento cuando el ERP genera el PD. Síncrono
 * (no depende del worker/Redis).
 */
async function insertCotizacionErp(
  orderId: string
): Promise<{ ok: true; cv: string } | { ok: false; error: string }> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      numero: true,
      ordenCompra: true,
      direccionEnvio: true,
      subtotal: true,
      impuesto: true,
      total: true,
      quote: { select: { numero: true } },
      client: {
        select: {
          personType: true,
          razonSocial: true,
          nombreComercial: true,
          nombres: true,
          apellidos: true,
          numeroDocumento: true,
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
          largo: true,
          ancho: true,
          figura: true,
        },
      },
    },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado." };

  try {
    // El ERP crea SOLO una cotización 'CV' (nunca 'PD'/'PX'); el vendedor lo
    // deriva el SP del maestro MTPROCLI por NIT. Las carátulas no viajan:
    // son títulos sin código en MTMERCIA; solo van sus productos.
    const result = await getErpClient().sendOrder({
      id: order.id,
      numero: order.numero,
      quoteNumero: order.quote?.numero ?? null,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      impuesto: Number(order.impuesto),
      nit: order.client.numeroDocumento,
      clientName: clientDisplayName(order.client),
      ordenCompra: order.ordenCompra,
      direccionEnvio: order.direccionEnvio,
      items: order.items
        .filter((it) => it.tipo === "PRODUCTO")
        .map((it) => ({
          referencia: it.referencia,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          precio: Number(it.precio),
          total: Number(it.total),
          nota: it.observacionesInternas,
          largo: it.largo === null ? null : Number(it.largo),
          ancho: it.ancho === null ? null : Number(it.ancho),
          figura: it.figura,
        })),
    });
    await db.erpSync.update({
      where: { orderId },
      data: {
        estadoEnvio: "ENVIADO",
        nPedidoOfimatica: result.nPedidoOfimatica,
        identificadorCotizacion: result.identificadorCotizacion,
        fechaEnvio: new Date(),
        fechaCreacion: new Date(result.fechaCreacion),
        ultimoError: null,
        intentos: { increment: 1 },
      },
    });
    return { ok: true, cv: result.nPedidoOfimatica };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error insertando la CV en ofimática.";
    await db.erpSync.updateMany({
      where: { orderId },
      data: { estadoEnvio: "ERROR", ultimoError: message, intentos: { increment: 1 } },
    });
    return { ok: false, error: message };
  }
}

/**
 * Genera un pedido a partir de una cotización APROBADA (copia ítems), inserta la
 * COTIZACIÓN (CV) en el ERP vía los stored procedures y envía un correo de
 * respaldo (ORDER_NOTIFY_EMAIL). Si la BD del ERP no está configurada, solo se
 * envía el correo. Ver docs/INTEGRACION-OFIMATICA.md.
 */
export async function generateOrderFromQuote(
  quoteId: string
): Promise<
  | { ok: true; id: string; erp?: "ENVIADO" | "ERROR"; mail?: "ENVIADO" | "ERROR" }
  | { ok: false; error: string }
> {
  const user = await requirePermission("create", "orders");

  const q = await db.quote.findFirst({
    where: { id: quoteId, companyId: user.companyId, deletedAt: null },
    include: {
      items: { orderBy: [{ posicion: "asc" }, { id: "asc" }] },
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
  // Las validaciones aplican solo a productos: las carátulas son títulos
  // agrupadores sin referencia ni acabados propios.
  const productos = q.items.filter((it) => it.tipo === "PRODUCTO");
  if (productos.length === 0) {
    return { ok: false, error: "La cotización no tiene ítems." };
  }
  // Los acabados (Formica/Canto/Herraje) deben estar definidos: no se genera el
  // pedido si algún ítem sigue "POR DEFINIR" (pendiente de diseño/planos).
  const porDefinir = productos.filter((it) =>
    it.acabados?.toUpperCase().includes("POR DEFINIR")
  );
  if (porDefinir.length > 0) {
    return {
      ok: false,
      error: `No se puede generar el pedido: ${porDefinir.length} ítem(es) tienen acabados POR DEFINIR. Defínelos antes de generar el pedido.`,
    };
  }
  // El cliente debe tener NIT/documento (requerido por el pedido y por el ERP,
  // que deriva vendedor/cuenta de MTPROCLI por NIT).
  if (!q.client.numeroDocumento?.trim()) {
    return {
      ok: false,
      error: "El cliente no tiene número de documento (NIT), requerido para generar el pedido.",
    };
  }
  // Cada producto debe tener referencia (código, FK a MTMERCIA en el ERP).
  const sinReferencia = productos.filter((it) => !it.referencia?.trim());
  if (sinReferencia.length > 0) {
    return {
      ok: false,
      error: `No se puede generar el pedido: ${sinReferencia.length} ítem(es) sin referencia (código de producto).`,
    };
  }

  const last = await db.order.findFirst({
    where: { companyId: user.companyId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });

  // Los ítems se copian con su estructura (carátulas + hijos, ids remapeados)
  // en 2 pasos por la FK autorreferente parentId.
  const order = await db.$transaction(async (tx) => {
    const o = await tx.order.create({
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
        approvals: { create: APPROVAL_KINDS.map((kind) => ({ kind })) },
        erpSync: { create: {} },
      },
    });
    await insertLineItemRows(tx, cloneLineItemRows(q.items, { orderId: o.id }));
    return o;
  });

  // Inserta la cotización (CV) en el ERP (SQL Server) vía stored procedures. El
  // pedido ya quedó creado; si la inserción falla, se registra el error en el
  // ErpSync (visible en el pedido con opción de reintentar) y el correo de
  // respaldo permite el ingreso manual.
  let erp: "ENVIADO" | "ERROR" | undefined;
  if (isErpDbConfigured()) {
    const res = await insertCotizacionErp(order.id);
    erp = res.ok ? "ENVIADO" : "ERROR";
  }

  // Correo de respaldo con los datos de la cotización para ingresarla en el ERP.
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
      // La carátula va como fila-sección (con la suma) seguida de sus
      // productos: quien ingresa la CV a mano necesita el desglose real.
      // El separador va como fila de solo texto.
      items: groupLineItems(q.items).flatMap(({ item, hijos }) => {
        const fila = (it: (typeof q.items)[number]) => ({
          referencia: it.referencia,
          descripcion: it.descripcion,
          acabados: it.acabados,
          medidas: medidasToString({
            esArea: it.esArea,
            largo: it.largo === null ? null : Number(it.largo),
            ancho: it.ancho === null ? null : Number(it.ancho),
            figura: it.figura,
          }),
          cantidad: it.cantidad,
          precio: Number(it.precio),
          descuentoPct: Number(it.descuentoPct),
          total: Number(it.total),
        });
        if (item.tipo === "SEPARADOR") {
          return [{ ...fila(item), separador: true }];
        }
        if (item.tipo !== "CARATULA") return [fila(item)];
        return [
          { ...fila(item), total: sumTotals(hijos), caratula: true },
          ...hijos.map(fila),
        ];
      }),
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
  return { ok: true, id: order.id, erp, mail };
}

/**
 * Reintenta la inserción de la cotización (CV) en el ERP para un pedido cuyo
 * envío falló. Útil tras corregir datos maestros (cliente/referencias) en el ERP.
 */
export async function retryErpInsert(orderId: string): Promise<ActionResult> {
  const user = await requirePermission("send_ofimatica", "orders");
  const order = await db.order.findFirst({
    where: { id: orderId, companyId: user.companyId },
    select: { id: true, erpSync: { select: { estadoEnvio: true } } },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (!isErpDbConfigured()) {
    return { ok: false, error: "La BD del ERP (ofimática) no está configurada." };
  }
  if (order.erpSync?.estadoEnvio === "ENVIADO") {
    return { ok: false, error: "La cotización ya fue insertada en ofimática." };
  }
  const res = await insertCotizacionErp(orderId);
  revalidatePath(`/pedidos/${orderId}`);
  return res.ok ? { ok: true } : { ok: false, error: res.error };
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
    select: { id: true, erpSync: { select: { nPedidoOfimatica: true } } },
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
    const { pd } = await resolveErpStatus(orderId);
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
