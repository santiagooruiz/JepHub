import { db } from "./db";
import { getCurrentUser } from "./auth";

/**
 * Empresa (tenant) actual: la del usuario autenticado.
 * Fallback a la primera empresa (p. ej. contextos sin sesión).
 */
export async function getCurrentCompanyId(): Promise<string> {
  const user = await getCurrentUser();
  if (user) return user.companyId;

  const company = await db.company.findFirst({ orderBy: { createdAt: "asc" } });
  if (!company) {
    throw new Error("No hay empresa configurada. Ejecuta el seed (pnpm db:seed).");
  }
  return company.id;
}
