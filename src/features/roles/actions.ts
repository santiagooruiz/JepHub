"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import type { ActionResult } from "@/features/config/actions";

/** Activa/desactiva un permiso para un rol. El rol Administrador es
 *  intocable: siempre conserva todos los permisos (evita auto-bloqueos). */
export async function setRolePermission(
  roleId: string,
  permissionId: string,
  active: boolean
): Promise<ActionResult> {
  const user = await requirePermission("manage", "roles");

  const role = await db.role.findFirst({
    where: { id: roleId, companyId: user.companyId },
    select: { id: true, name: true },
  });
  if (!role) return { ok: false, error: "Rol no encontrado." };
  if (role.name === "Administrador") {
    return { ok: false, error: "El rol Administrador no se puede modificar." };
  }

  const permission = await db.permission.findUnique({
    where: { id: permissionId },
    select: { id: true },
  });
  if (!permission) return { ok: false, error: "Permiso no encontrado." };

  await db.rolePermission.upsert({
    where: { roleId_permissionId: { roleId, permissionId } },
    update: { active },
    create: { roleId, permissionId, active },
  });

  revalidatePath("/configuracion/roles");
  return { ok: true };
}
