import { db } from "@/lib/db";
import { clientDisplayName } from "@/features/clients/queries";
import { isErpDbConfigured } from "@/server/ofimatica/db";
import { getErpContactsByNits } from "@/server/ofimatica/clients";

export type OpportunityOptions = {
  clients: { id: string; name: string }[];
  contacts: { clientId: string; nombre: string; cargo: string | null }[];
};

export async function getOpportunityOptions(
  companyId: string
): Promise<OpportunityOptions> {
  const [clients, contacts] = await Promise.all([
    db.client.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true,
        personType: true,
        nombres: true,
        apellidos: true,
        razonSocial: true,
        nombreComercial: true,
        numeroDocumento: true,
      },
      orderBy: { numero: "desc" },
    }),
    db.contact.findMany({
      where: { client: { companyId, deletedAt: null } },
      select: { clientId: true, nombre: true, cargo: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  // Contactos del ERP (MTPROCLI ZCONTAC1..4) de los clientes anclados por NIT.
  // Si el ERP no responde, el formulario sigue funcionando con los locales.
  const allContacts: OpportunityOptions["contacts"] = [...contacts];
  if (isErpDbConfigured()) {
    try {
      const byNit = new Map(
        clients
          .filter((c) => c.numeroDocumento)
          .map((c) => [c.numeroDocumento as string, c.id])
      );
      const erpContacts = await getErpContactsByNits([...byNit.keys()]);
      for (const ec of erpContacts) {
        const clientId = byNit.get(ec.nit);
        if (!clientId) continue;
        // Evita duplicados si el mismo nombre existe como contacto local.
        if (
          allContacts.some((c) => c.clientId === clientId && c.nombre === ec.nombre)
        ) {
          continue;
        }
        allContacts.push({ clientId, nombre: ec.nombre, cargo: ec.cargo || null });
      }
    } catch {
      // ERP caído: se omiten sus contactos.
    }
  }

  return {
    clients: clients.map((c) => ({ id: c.id, name: clientDisplayName(c) })),
    contacts: allContacts,
  };
}
