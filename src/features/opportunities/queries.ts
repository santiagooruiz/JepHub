import { db } from "@/lib/db";
import { clientDisplayName } from "@/features/clients/queries";

export type OpportunityOptions = {
  clients: { id: string; name: string; advisorId: string | null }[];
  advisors: { id: string; name: string }[];
};

export async function getOpportunityOptions(
  companyId: string
): Promise<OpportunityOptions> {
  const [clients, advisors] = await Promise.all([
    db.client.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true,
        personType: true,
        nombres: true,
        apellidos: true,
        razonSocial: true,
        nombreComercial: true,
        advisorId: true,
      },
      orderBy: { numero: "desc" },
    }),
    db.user.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    clients: clients.map((c) => ({
      id: c.id,
      name: clientDisplayName(c),
      advisorId: c.advisorId,
    })),
    advisors,
  };
}
