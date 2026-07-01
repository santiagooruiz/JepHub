"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import type { ActionResult } from "@/features/config/actions";
import { QUOTE_ESTADOS, IVA_RATE } from "./types";

type SaveResult = { ok: true; id: string } | { ok: false; error: string };

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
  }

  revalidatePath("/cotizaciones");
  return { ok: true, id: quoteId };
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
