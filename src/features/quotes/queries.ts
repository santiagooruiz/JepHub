import { Prisma, type LineItem } from "@prisma/client";

import { db } from "@/lib/db";
import { clientDisplayName } from "@/features/clients/queries";
import { groupLineItems, sumTotals } from "./line-items";
import type { QuoteDocData, QuoteDocItem } from "./quote-document";

export const quoteDocInclude = Prisma.validator<Prisma.QuoteInclude>()({
  client: true,
  registeredBy: { select: { name: true } },
  opportunity: { select: { nombre: true } },
  items: { orderBy: [{ posicion: "asc" as const }, { id: "asc" as const }] },
});

type QuoteWithRels = Prisma.QuoteGetPayload<{ include: typeof quoteDocInclude }>;

function mapDocItem(it: LineItem): QuoteDocItem {
  return {
    tipo: "PRODUCTO",
    referencia: it.referencia ?? "",
    descripcion: it.descripcion ?? "",
    acabados: it.acabados ?? "",
    precio: Number(it.precio),
    cantidad: it.cantidad,
    descuentoPct: Number(it.descuentoPct),
    total: Number(it.total),
  };
}

export function mapQuoteToDoc(
  q: QuoteWithRels,
  opts?: {
    /**
     * Adjunta los productos internos de cada carátula (impresión interna
     * "con desglose"). Por defecto NO viajan en los datos del documento:
     * las páginas de cara al cliente (firma, print) no deben exponer el
     * desglose ni siquiera en el payload RSC embebido en el HTML.
     */
    detalleCaratulas?: boolean;
  }
): QuoteDocData {
  return {
    numero: q.numero,
    fecha: q.createdAt.toLocaleDateString("es-CO"),
    clienteNombre: clientDisplayName(q.client),
    clienteDoc: `${q.client.tipoDocumento ?? ""} ${q.client.numeroDocumento ?? ""}`.trim(),
    registradoPor: q.registeredBy?.name ?? "",
    oportunidad: q.opportunity?.nombre ?? "",
    formaPago: q.formaPago ?? "",
    tiempoEntrega: q.tiempoEntrega ?? "",
    fechaVencimiento: q.fechaVencimiento
      ? q.fechaVencimiento.toLocaleDateString("es-CO")
      : "",
    ordenCompra: q.ordenCompra ?? "",
    direccionEnvio: q.direccionEnvio ?? "",
    observacion: q.observacion ?? "",
    estado: q.estado,
    // Una carátula sale como una sola entrada con la suma de sus productos.
    items: groupLineItems(q.items).map(({ item, hijos }) => {
      if (item.tipo !== "CARATULA") return mapDocItem(item);
      const suma = sumTotals(hijos);
      return {
        tipo: "CARATULA",
        referencia: "",
        descripcion: item.descripcion ?? "",
        acabados: "",
        precio: suma,
        cantidad: 1,
        descuentoPct: 0,
        total: suma,
        ...(opts?.detalleCaratulas ? { hijos: hijos.map(mapDocItem) } : {}),
      };
    }),
    subtotal: Number(q.subtotal),
    impuesto: Number(q.impuesto),
    total: Number(q.total),
  };
}

export type ProductOption = {
  id: string;
  codigo: string;
  nombre: string;
  precioBase: number;
  acabados: string | null;
};

export type QuoteOptions = {
  clients: { id: string; name: string }[];
  opportunities: { id: string; label: string; clientId: string }[];
  products: ProductOption[];
};

export async function getQuoteOptions(
  companyId: string,
  opts?: { advisorId?: string }
): Promise<QuoteOptions> {
  const [clients, opportunities, products] = await Promise.all([
    db.client.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true,
        personType: true,
        nombres: true,
        apellidos: true,
        razonSocial: true,
        nombreComercial: true,
      },
      orderBy: { numero: "desc" },
    }),
    // Un Asesor solo puede cotizar sobre sus propias oportunidades.
    db.opportunity.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(opts?.advisorId ? { advisorId: opts.advisorId } : {}),
      },
      select: { id: true, numero: true, nombre: true, clientId: true },
      orderBy: { numero: "desc" },
    }),
    db.product.findMany({
      where: { companyId },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return {
    clients: clients.map((c) => ({ id: c.id, name: clientDisplayName(c) })),
    opportunities: opportunities.map((o) => ({
      id: o.id,
      label: `N° ${o.numero} · ${o.nombre}`,
      clientId: o.clientId,
    })),
    products: products.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      precioBase: Number(p.precioBase ?? 0),
      acabados: p.formica ? `FORMICA: ${p.formica}` : null,
    })),
  };
}
