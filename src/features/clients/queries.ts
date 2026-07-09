import { db } from "@/lib/db";
import { isErpDbConfigured } from "@/server/ofimatica/db";
import { getErpAsesores } from "@/server/ofimatica/clients";
import type { ClientOptions } from "./client-form";

export async function getClientOptions(
  companyId: string
): Promise<ClientOptions> {
  const [asesores, priceLists, sectors, channels] = await Promise.all([
    // Asesores: catálogo del ERP (VENDEN). En dev sin ERP, lista vacía.
    isErpDbConfigured() ? getErpAsesores() : Promise.resolve([]),
    db.priceList.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.sector.findMany({
      include: {
        subsectors: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({
      where: { companyId, entity: "channel" },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    asesores,
    priceLists,
    sectors: sectors.map((s) => ({
      id: s.id,
      name: s.name,
      subsectors: s.subsectors,
    })),
    channels: channels.map((c) => c.name),
  };
}

export function clientDisplayName(c: {
  personType: string;
  nombres: string | null;
  apellidos: string | null;
  razonSocial: string | null;
  nombreComercial: string | null;
}): string {
  if (c.personType === "NATURAL") {
    return [c.nombres, c.apellidos].filter(Boolean).join(" ") || "(sin nombre)";
  }
  return c.razonSocial || c.nombreComercial || "(sin nombre)";
}
