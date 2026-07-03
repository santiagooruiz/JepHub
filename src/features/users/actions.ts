"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import type { ActionResult } from "@/features/config/actions";

/** Activa o desactiva un usuario. Un usuario INACTIVO no puede iniciar
 *  sesión y su sesión vigente se corta en el siguiente request. */
export async function setUserStatus(
  userId: string,
  status: "ACTIVE" | "INACTIVE"
): Promise<ActionResult> {
  const user = await requirePermission("edit", "users");
  if (status !== "ACTIVE" && status !== "INACTIVE") {
    return { ok: false, error: "Estado inválido." };
  }
  if (userId === user.id) {
    return { ok: false, error: "No puedes desactivar tu propio usuario." };
  }

  const { count } = await db.user.updateMany({
    where: { id: userId, companyId: user.companyId },
    data: { status },
  });
  if (!count) return { ok: false, error: "Usuario no encontrado." };

  revalidatePath("/configuracion/usuarios");
  return { ok: true };
}
