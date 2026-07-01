"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import type { ActionResult } from "@/features/config/actions";

const schema = z.object({
  entityType: z.enum(["CLIENT", "OPPORTUNITY", "QUOTE", "ORDER"]),
  entityId: z.string().min(1),
  accion: z.string().min(1, "Acción requerida"),
  fechaHora: z.string().min(1, "Fecha requerida"),
  observaciones: z.string().optional().nullable(),
});

/** Registra una actividad de seguimiento sobre una entidad (transversal). */
export async function registerActivity(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { entityType, entityId, accion, fechaHora, observaciones } = parsed.data;

  // Verificación de tenant + resolución de la FK correcta.
  let fk: {
    clientId?: string;
    opportunityId?: string;
    quoteId?: string;
    orderId?: string;
  };
  let path: string;

  if (entityType === "CLIENT") {
    const found = await db.client.findFirst({
      where: { id: entityId, companyId: user.companyId },
      select: { id: true },
    });
    if (!found) return { ok: false, error: "Registro no encontrado." };
    fk = { clientId: entityId };
    path = `/clientes/${entityId}`;
  } else if (entityType === "OPPORTUNITY") {
    const found = await db.opportunity.findFirst({
      where: { id: entityId, companyId: user.companyId },
      select: { id: true },
    });
    if (!found) return { ok: false, error: "Registro no encontrado." };
    fk = { opportunityId: entityId };
    path = `/oportunidades/${entityId}`;
  } else if (entityType === "QUOTE") {
    const found = await db.quote.findFirst({
      where: { id: entityId, companyId: user.companyId },
      select: { id: true },
    });
    if (!found) return { ok: false, error: "Registro no encontrado." };
    fk = { quoteId: entityId };
    path = `/cotizaciones/${entityId}`;
  } else if (entityType === "ORDER") {
    const found = await db.order.findFirst({
      where: { id: entityId, companyId: user.companyId },
      select: { id: true },
    });
    if (!found) return { ok: false, error: "Registro no encontrado." };
    fk = { orderId: entityId };
    path = `/pedidos/${entityId}`;
  } else {
    return { ok: false, error: "Entidad no soportada aún." };
  }

  const fecha = new Date(fechaHora);
  if (Number.isNaN(fecha.getTime())) {
    return { ok: false, error: "Fecha inválida." };
  }

  await db.activity.create({
    data: {
      companyId: user.companyId,
      entityType,
      ...fk,
      accion,
      fechaHora: fecha,
      observaciones: observaciones?.trim() || null,
      userId: user.id,
      auto: false,
    },
  });

  if (entityType === "CLIENT") {
    await db.client.update({
      where: { id: entityId },
      data: { ultimaInteraccion: fecha },
    });
  }

  revalidatePath(path);
  return { ok: true };
}
