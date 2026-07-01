import { db } from "@/lib/db";
import { clientDisplayName } from "@/features/clients/queries";

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
