"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";

/** Marca como leídas todas las notificaciones del usuario (propias + difusión). */
export async function markAllNotificationsRead(): Promise<{ ok: true }> {
  const user = await requireUser();
  await db.notification.updateMany({
    where: {
      companyId: user.companyId,
      leida: false,
      OR: [{ userId: user.id }, { userId: null }],
    },
    data: { leida: true },
  });
  return { ok: true };
}
