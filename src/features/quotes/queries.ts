import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { clientDisplayName } from "@/features/clients/queries";
import type { QuoteDocData } from "./quote-document";

export const quoteDocInclude = Prisma.validator<Prisma.QuoteInclude>()({
  client: true,
  registeredBy: { select: { name: true } },
  opportunity: { select: { nombre: true } },
  items: true,
});

type QuoteWithRels = Prisma.QuoteGetPayload<{ include: typeof quoteDocInclude }>;

export function mapQuoteToDoc(q: QuoteWithRels): QuoteDocData {
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
    items: q.items.map((it) => ({
      referencia: it.referencia ?? "",
      descripcion: it.descripcion ?? "",
      acabados: it.acabados ?? "",
      precio: Number(it.precio),
      cantidad: it.cantidad,
      descuentoPct: Number(it.descuentoPct),
      total: Number(it.total),
    })),
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

export async function getQuoteOptions(companyId: string): Promise<QuoteOptions> {
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
    db.opportunity.findMany({
      where: { companyId, deletedAt: null },
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
