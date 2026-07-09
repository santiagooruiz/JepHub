import { db } from "@/lib/db";
import { isErpDbConfigured } from "@/server/ofimatica/db";
import { getErpAsesores } from "@/server/ofimatica/clients";
import type { UserFormOptions } from "./user-form";

/** Opciones para el formulario de usuario: roles (Postgres) + asesores (ERP). */
export async function getUserFormOptions(companyId: string): Promise<UserFormOptions> {
  const [roles, asesores] = await Promise.all([
    db.role.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    isErpDbConfigured() ? getErpAsesores() : Promise.resolve([]),
  ]);
  return { roles, asesores };
}
