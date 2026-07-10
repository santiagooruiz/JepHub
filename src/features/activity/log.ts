import { db } from "@/lib/db";
import type { EntityType } from "@prisma/client";

/**
 * Registra una actividad automática (`auto: true`) en el histórico
 * transversal. Al setear también `clientId`, el evento aparece en la ficha
 * del cliente además del timeline de la entidad (oportunidad/cotización/
 * pedido), como en el CRM original ("Registró la Oportunidad X al cliente Y").
 */
export async function logAutoActivity(data: {
  companyId: string;
  userId: string;
  entityType: EntityType;
  accion: string;
  clientId?: string | null;
  opportunityId?: string | null;
  quoteId?: string | null;
  orderId?: string | null;
}): Promise<void> {
  await db.activity.create({
    data: {
      companyId: data.companyId,
      entityType: data.entityType,
      clientId: data.clientId ?? null,
      opportunityId: data.opportunityId ?? null,
      quoteId: data.quoteId ?? null,
      orderId: data.orderId ?? null,
      accion: data.accion,
      fechaHora: new Date(),
      userId: data.userId,
      auto: true,
    },
  });
}
