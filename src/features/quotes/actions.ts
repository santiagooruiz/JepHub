"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { getErpClientByNit } from "@/server/ofimatica/clients";
import { isErpDbConfigured } from "@/server/ofimatica/db";
import {
  getErpAcabadosDeProducto,
  getErpOpcionesAcabado,
  type ErpAcabadoOpcion,
  type ErpAcabadoProducto,
} from "@/server/ofimatica/acabados";
import type { ActionResult } from "@/features/config/actions";
import { logAutoActivity } from "@/features/activity/log";
import { clientDisplayName } from "@/features/clients/queries";
import { QUOTE_ESTADOS, IVA_RATE } from "./types";
import {
  acabadosToString,
  cloneLineItemRows,
  insertLineItemRows,
} from "./line-items";

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

// Selección de un acabado del ERP (ver line-items.ts → AcabadoSel).
const acabadoSelSchema = z.object({
  codigo: z.string().trim().min(1),
  nombre: z.string().trim().min(1),
  opcionCodigo: nullableStr,
  opcionNombre: nullableStr,
  opcionColor: nullableStr,
});

const productoSchema = z.object({
  productId: nullableStr,
  referencia: nullableStr,
  descripcion: nullableStr,
  acabados: nullableStr,
  // Selecciones estructuradas de acabados (ERP). null/ausente = sin datos del
  // ERP (se conserva el texto libre de `acabados`); [] = producto sin acabados.
  acabadosSel: z.array(acabadoSelSchema).nullish(),
  observacionesInternas: nullableStr,
  precio: z.coerce.number().min(0),
  cantidad: z.coerce.number().int().min(1),
  descuentoPct: z.coerce.number().min(0).max(100),
});

// Entrada de nivel superior: producto suelto, carátula (título) con sus
// productos, o separador (solo texto, para seccionar la cotización). El
// preprocess asume PRODUCTO si falta `tipo` (payloads viejos).
const entradaSchema = z.preprocess(
  (v) =>
    v && typeof v === "object" && !("tipo" in v)
      ? { ...v, tipo: "PRODUCTO" }
      : v,
  z.discriminatedUnion("tipo", [
    productoSchema.extend({ tipo: z.literal("PRODUCTO") }),
    z.object({
      tipo: z.literal("CARATULA"),
      titulo: z.string().trim().min(1, "La carátula necesita un título"),
      hijos: z
        .array(productoSchema)
        .min(1, "Cada carátula debe tener al menos un producto"),
    }),
    z.object({
      tipo: z.literal("SEPARADOR"),
      titulo: z.string().trim().min(1, "El separador necesita un texto"),
    }),
  ])
);

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
  items: z.array(entradaSchema).min(1, "Agrega al menos un ítem"),
});

type ProductoInput = z.infer<typeof productoSchema>;

function productoRow(it: ProductoInput) {
  const precioConDesc = it.precio * (1 - it.descuentoPct / 100);
  // Con selecciones del ERP el string `acabados` se deriva (un acabado sin
  // opción queda "POR DEFINIR"); sin ellas se respeta el texto recibido.
  const sel = it.acabadosSel ?? null;
  const acabados = sel
    ? sel.length
      ? acabadosToString(sel)
      : null
    : it.acabados;
  return {
    productId: it.productId,
    referencia: it.referencia,
    descripcion: it.descripcion,
    acabados,
    acabadosJson: sel ?? undefined,
    observacionesInternas: it.observacionesInternas,
    precio: it.precio,
    cantidad: it.cantidad,
    descuentoPct: it.descuentoPct,
    precioConDesc,
    total: precioConDesc * it.cantidad,
  };
}

/**
 * Aplana las entradas (productos, carátulas con hijos y separadores) a filas
 * `LineItem` con `posicion` secuencial. Carátulas y separadores llevan montos
 * en 0 (el valor de la carátula se deriva de los hijos), así el subtotal =
 * suma de filas PRODUCTO sin doble conteo.
 */
function flattenEntradas(entradas: z.infer<typeof entradaSchema>[]): {
  rows: Prisma.LineItemCreateManyInput[];
  subtotal: number;
} {
  const rows: Prisma.LineItemCreateManyInput[] = [];
  let subtotal = 0;
  let posicion = 0;
  for (const entrada of entradas) {
    if (entrada.tipo === "SEPARADOR") {
      rows.push({
        tipo: "SEPARADOR",
        posicion: posicion++,
        descripcion: entrada.titulo,
        precio: 0,
        cantidad: 1,
        descuentoPct: 0,
        precioConDesc: 0,
        total: 0,
      });
    } else if (entrada.tipo === "CARATULA") {
      const caratulaId = globalThis.crypto.randomUUID();
      rows.push({
        id: caratulaId,
        tipo: "CARATULA",
        posicion: posicion++,
        descripcion: entrada.titulo,
        precio: 0,
        cantidad: 1,
        descuentoPct: 0,
        precioConDesc: 0,
        total: 0,
      });
      for (const hijo of entrada.hijos) {
        const row = productoRow(hijo);
        subtotal += row.total;
        rows.push({
          ...row,
          tipo: "PRODUCTO",
          parentId: caratulaId,
          posicion: posicion++,
        });
      }
    } else {
      const row = productoRow(entrada);
      subtotal += row.total;
      rows.push({ ...row, tipo: "PRODUCTO", posicion: posicion++ });
    }
  }
  return { rows, subtotal };
}

/**
 * Acabados que lleva un producto según el ERP (ZPROACA). Devuelve [] si el
 * producto no tiene acabados; ok:false si el ERP no está configurado o falla
 * (el builder conserva entonces el texto libre heredado).
 */
export async function getAcabadosProducto(
  referencia: string
): Promise<
  { ok: true; acabados: ErpAcabadoProducto[] } | { ok: false; error: string }
> {
  await requirePermission("view", "quotes");
  const ref = referencia.trim();
  if (!ref) return { ok: false, error: "Referencia vacía." };
  if (!isErpDbConfigured()) {
    return { ok: false, error: "La BD del ERP (ofimática) no está configurada." };
  }
  try {
    return { ok: true, acabados: await getErpAcabadosDeProducto(ref) };
  } catch {
    return { ok: false, error: "No se pudieron consultar los acabados en ofimática." };
  }
}

/** Opciones (materiales/colores) de un acabado del ERP, para el select. */
export async function getOpcionesAcabado(
  codigoAcabado: string
): Promise<
  { ok: true; opciones: ErpAcabadoOpcion[] } | { ok: false; error: string }
> {
  await requirePermission("view", "quotes");
  const cod = codigoAcabado.trim();
  if (!cod) return { ok: false, error: "Código de acabado vacío." };
  if (!isErpDbConfigured()) {
    return { ok: false, error: "La BD del ERP (ofimática) no está configurada." };
  }
  try {
    return { ok: true, opciones: await getErpOpcionesAcabado(cod) };
  } catch {
    return { ok: false, error: "No se pudieron consultar las opciones en ofimática." };
  }
}

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
    select: {
      id: true,
      personType: true,
      nombres: true,
      apellidos: true,
      razonSocial: true,
      nombreComercial: true,
    },
  });
  if (!client) return { ok: false, error: "Cliente no encontrado." };

  const { rows, subtotal } = flattenEntradas(d.items);
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
      select: { id: true, numero: true },
    });
    if (!existing) return { ok: false, error: "Cotización no encontrada." };
    await db.$transaction(async (tx) => {
      await tx.lineItem.deleteMany({ where: { quoteId: d.id } });
      await tx.quote.update({ where: { id: d.id }, data: header });
      await insertLineItemRows(
        tx,
        rows.map((r) => ({ ...r, quoteId: d.id! }))
      );
    });
    quoteId = d.id;
    await logAutoActivity({
      companyId: user.companyId,
      userId: user.id,
      entityType: "QUOTE",
      accion: `Actualizó la cotización N° ${existing.numero}`,
      clientId: d.clientId,
      opportunityId: d.opportunityId,
      quoteId,
    });
  } else {
    const last = await db.quote.findFirst({
      where: { companyId: user.companyId },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    const created = await db.$transaction(async (tx) => {
      const q = await tx.quote.create({
        data: {
          companyId: user.companyId,
          numero: (last?.numero ?? 0) + 1,
          registeredById: user.id,
          ...header,
        },
      });
      await insertLineItemRows(
        tx,
        rows.map((r) => ({ ...r, quoteId: q.id }))
      );
      return q;
    });
    quoteId = created.id;
    await logAutoActivity({
      companyId: user.companyId,
      userId: user.id,
      entityType: "QUOTE",
      accion: `Registró la cotización N° ${created.numero} al cliente ${clientDisplayName(client)}`,
      clientId: d.clientId,
      opportunityId: d.opportunityId,
      quoteId,
    });

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
    include: { items: { orderBy: [{ posicion: "asc" }, { id: "asc" }] } },
  });
  if (!source) return { ok: false, error: "Cotización no encontrada." };

  const last = await db.quote.findFirst({
    where: { companyId: user.companyId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const created = await db.$transaction(async (tx) => {
    const q = await tx.quote.create({
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
      },
    });
    await insertLineItemRows(
      tx,
      cloneLineItemRows(source.items, { quoteId: q.id })
    );
    return q;
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

  await logAutoActivity({
    companyId: user.companyId,
    userId: user.id,
    entityType: "QUOTE",
    accion: `Registró la cotización N° ${created.numero} (duplicado de la N° ${source.numero})`,
    clientId: source.clientId,
    opportunityId: source.opportunityId,
    quoteId: created.id,
  });

  revalidatePath("/cotizaciones");
  if (source.opportunityId) revalidatePath(`/oportunidades/${source.opportunityId}`);
  return { ok: true, id: created.id };
}

export async function deleteQuote(id: string): Promise<ActionResult> {
  const user = await requirePermission("delete", "quotes");
  const quote = await db.quote.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    select: { id: true, numero: true, clientId: true, opportunityId: true },
  });
  if (!quote) return { ok: false, error: "Cotización no encontrada." };

  await db.quote.update({
    where: { id: quote.id },
    data: { deletedAt: new Date() },
  });
  await logAutoActivity({
    companyId: user.companyId,
    userId: user.id,
    entityType: "QUOTE",
    accion: `Eliminó la cotización N° ${quote.numero}`,
    clientId: quote.clientId,
    opportunityId: quote.opportunityId,
    quoteId: quote.id,
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
  const quote = await db.quote.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    select: { id: true, numero: true, clientId: true, opportunityId: true, estado: true },
  });
  if (!quote) return { ok: false, error: "Cotización no encontrada." };

  await db.quote.update({ where: { id: quote.id }, data: { estado } });
  if (estado !== quote.estado) {
    await logAutoActivity({
      companyId: user.companyId,
      userId: user.id,
      entityType: "QUOTE",
      accion: `Cambió el estado de la cotización N° ${quote.numero} a ${estado}`,
      clientId: quote.clientId,
      opportunityId: quote.opportunityId,
      quoteId: quote.id,
    });
  }
  revalidatePath(`/cotizaciones/${id}`);
  revalidatePath("/cotizaciones");
  return { ok: true };
}
