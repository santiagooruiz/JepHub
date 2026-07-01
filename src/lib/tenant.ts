import { db } from "./db";

/**
 * Empresa (tenant) actual.
 * STUB: hasta que exista sesión (Sprint 1B, better-auth) usamos la primera
 * empresa. Luego se derivará del usuario autenticado.
 */
export async function getCurrentCompanyId(): Promise<string> {
  const company = await db.company.findFirst({ orderBy: { createdAt: "asc" } });
  if (!company) {
    throw new Error("No hay empresa configurada. Ejecuta el seed (pnpm db:seed).");
  }
  return company.id;
}
