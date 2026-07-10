"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { getErpClientByNit } from "@/server/ofimatica/clients";
import type { ActionResult } from "@/features/config/actions";
import { QUOTE_ESTADOS, IVA_RATE } from "./types";

type SaveResult = { ok: true; id: string } | { ok: false; error: string };

export type QuoteClientInfo = {
  telefono: string;
  email: string;
  listaPrecio: string;
  /** MTPROCLI.DIRECCION — dirección principal y default de "Dirección de envío". */
  direccion: string;
};

/**
 * Datos del cliente para el encabezado de la cotización (teléfono, email,
 * lista de precio y dirección). La fuente de verdad es el ERP (MTPROCLI, por
 * NIT); si el cliente no existe allí o el ERP no responde, cae a los campos
 * del cliente local.
 */
export async function getQuoteClientInfo(
  clientId: string
): Promise<{ ok: true; info: QuoteClientInfo } | { ok: false; error: string }> {
  const user = await requirePermission("view", "quotes");

  const client = await db.client.findFirst({
    where: { id: clientId, companyId: user.companyId, deletedAt: null },
    select: {
      telefono: true,
      email: true,
      direccion: true,
      numeroDocumento: true,
      priceList: { select: { name: true } },
    },
  });
  if (!client) return { ok: false, error: "Cliente no encontrado." };

  let erp = null;
  if (client.numeroDocumento) {
    try {
      erp = await getErpClientByNit(client.numeroDocumento);
    } catch {
      // ERP fuera de línea: seguimos con los datos locales.
    }
  }

  return {
    ok: true,
    info: {
      telefono: erp?.tel1 || client.telefono || "",
      email: erp?.email || client.email || "",
      listaPrecio: erp?.listaPrecio || client.priceList?.name || "",
      direccion: erp?.direccion || client.direccion || "",
    },
  };
}

const nullableStr = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : null));

const itemSchema = z.object({
  productId: nullableStr,
  referencia: nullableStr,
  descripcion: nullableStr,
  acabados: nullableStr,
  observacionesInternas: nullableStr,
  precio: z.coerce.number().min(0),
  cantidad: z.coerce.number().int().min(1),
  descuentoPct: z.coerce.number().min(0).max(100),
});

const schema = z.object({
  id: z.string().optional(),
  clientId: z.string().min(1, "Cliente requerido"),
  opportunityId: nullableStr,
  estado: z.string().min(1),
  formaPago: nullableStr,
  tiempoEntrega: nullableStr,
  ordenCompra: nullableStr,
  direccionEnvio: nullableStr,
  observacion: nullableStr,
  fechaVencimiento: nullableStr,
  items: z.array(itemSchema).min(1, "Agrega al menos un ítem"),
});

export async function saveQuote(input: unknown): Promise<SaveResult> {
  const raw = input as { id?: string };
  const user = await requirePermission(raw?.id ? "edit" : "create", "quotes");

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;

  const client = await db.client.findFirst({
    where: { id: d.clientId, companyId: user.companyId },
    select: { id: true },
  });
  if (!client) return { ok: false, error: "Cliente no encontrado." };

  const items = d.items.map((it) => {
    const precioConDesc = it.precio * (1 - it.descuentoPct / 100);
    return {
      productId: it.productId,
      referencia: it.referencia,
      descripcion: it.descripcion,
      acabados: it.acabados,
      observacionesInternas: it.observacionesInternas,
      precio: it.precio,
      cantidad: it.cantidad,
      descuentoPct: it.descuentoPct,
      precioConDesc,
      total: precioConDesc * it.cantidad,
    };
  });
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const impuesto = subtotal * IVA_RATE;
  const total = subtotal + impuesto;

  const fecha = d.fechaVencimiento ? new Date(d.fechaVencimiento) : null;
  const header = {
    clientId: d.clientId,
    opportunityId: d.opportunityId,
    estado: d.estado,
    formaPago: d.formaPago,
    tiempoEntrega: d.tiempoEntrega,
    ordenCompra: d.ordenCompra,
    direccionEnvio: d.direccionEnvio,
    observacion: d.observacion,
    fechaVencimiento: fecha && !Number.isNaN(fecha.getTime()) ? fecha : null,
    subtotal,
    impuesto,
    total,
  };

  let quoteId: string;
  if (d.id) {
    const existing = await db.quote.findFirst({
      where: { id: d.id, companyId: user.companyId },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Cotización no encontrada." };
    await db.$transaction([
      db.lineItem.deleteMany({ where: { quoteId: d.id } }),
      db.quote.update({
        where: { id: d.id },
        data: { ...header, items: { create: items } },
      }),
    ]);
    quoteId = d.id;
  } else {
    const last = await db.quote.findFirst({
      where: { companyId: user.companyId },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    const created = await db.quote.create({
      data: {
        companyId: user.companyId,
        numero: (last?.numero ?? 0) + 1,
        registeredById: user.id,
        ...header,
        items: { create: items },
      },
    });
    quoteId = created.id;

    // El estado de la oportunidad no se edita a mano: al crear su primera
    // cotización pasa de "No Cotizada" a "Cotizada".
    if (d.opportunityId) {
      await db.opportunity.updateMany({
        where: {
          id: d.opportunityId,
          companyId: user.companyId,
          estado: "No Cotizada",
        },
        data: { estado: "Cotizada" },
      });
      revalidatePath(`/oportunidades/${d.opportunityId}`);
    }
  }

  revalidatePath("/cotizaciones");
  return { ok: true, id: quoteId };
}

/**
 * Duplica una cotización (encabezado + ítems) como nueva cotización en
 * "Pendiente cotización", registrada por el usuario actual.
 */
export async function duplicateQuote(id: string): Promise<SaveResult> {
  const user = await requirePermission("create", "quotes");

  const source = await db.quote.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    include: { items: true },
  });
  if (!source) return { ok: false, error: "Cotización no encontrada." };

  const last = await db.quote.findFirst({
    where: { companyId: user.companyId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const created = await db.quote.create({
    data: {
      companyId: user.companyId,
      numero: (last?.numero ?? 0) + 1,
      registeredById: user.id,
      clientId: source.clientId,
      opportunityId: source.opportunityId,
      estado: "Pendiente cotización",
      formaPago: source.formaPago,
      tiempoEntrega: source.tiempoEntrega,
      ordenCompra: source.ordenCompra,
      direccionEnvio: source.direccionEnvio,
      observacion: source.observacion,
      fechaVencimiento: source.fechaVencimiento,
      subtotal: source.subtotal,
      impuesto: source.impuesto,
      total: source.total,
      items: {
        create: source.items.map((it) => ({
          productId: it.productId,
          referencia: it.referencia,
          descripcion: it.descripcion,
          acabados: it.acabados,
          observacionesInternas: it.observacionesInternas,
          precio: it.precio,
          cantidad: it.cantidad,
          descuentoPct: it.descuentoPct,
          precioConDesc: it.precioConDesc,
          total: it.total,
        })),
      },
    },
  });

  if (source.opportunityId) {
    await db.opportunity.updateMany({
      where: {
        id: source.opportunityId,
        companyId: user.companyId,
        estado: "No Cotizada",
      },
      data: { estado: "Cotizada" },
    });
  }

  revalidatePath("/cotizaciones");
  if (source.opportunityId) revalidatePath(`/oportunidades/${source.opportunityId}`);
  return { ok: true, id: created.id };
}

export async function deleteQuote(id: string): Promise<ActionResult> {
  const user = await requirePermission("delete", "quotes");
  await db.quote.updateMany({
    where: { id, companyId: user.companyId },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/cotizaciones");
  return { ok: true };
}

export async function updateQuoteState(
  id: string,
  estado: string
): Promise<ActionResult> {
  const user = await requirePermission("edit", "quotes");
  if (!QUOTE_ESTADOS.includes(estado)) {
    return { ok: false, error: "Estado inválido." };
  }
  await db.quote.updateMany({
    where: { id, companyId: user.companyId },
    data: { estado },
  });
  revalidatePath(`/cotizaciones/${id}`);
  revalidatePath("/cotizaciones");
  return { ok: true };
}
