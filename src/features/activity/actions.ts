"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import type { ActionResult } from "@/features/config/actions";

const schema = z.object({
  clientId: z.string().min(1),
  accion: z.string().min(1, "Acción requerida"),
  fechaHora: z.string().min(1, "Fecha requerida"),
  observaciones: z.string().optional().nullable(),
});

/** Registra una actividad de seguimiento sobre un cliente. */
export async function registerActivity(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { clientId, accion, fechaHora, observaciones } = parsed.data;

  const client = await db.client.findFirst({
    where: { id: clientId, companyId: user.companyId },
    select: { id: true },
  });
  if (!client) return { ok: false, error: "Cliente no encontrado." };

  const fecha = new Date(fechaHora);
  if (Number.isNaN(fecha.getTime())) {
    return { ok: false, error: "Fecha inválida." };
  }

  await db.activity.create({
    data: {
      companyId: user.companyId,
      entityType: "CLIENT",
      clientId,
      accion,
      fechaHora: fecha,
      observaciones: observaciones?.trim() || null,
      userId: user.id,
      auto: false,
    },
  });
  await db.client.update({
    where: { id: clientId },
    data: { ultimaInteraccion: fecha },
  });

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}
