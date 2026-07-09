// Alcance por rol ("lo de cada quien"): el rol Asesor solo ve sus propios
// registros. Estos helpers devuelven fragmentos de `where` de Prisma que se
// mezclan (spread) en las consultas de listado y detalle; para los demás roles
// devuelven {} (sin restricción). El equivalente del lado ERP (clientes por
// MTPROCLI.VENDEDOR) vive en src/server/ofimatica/clients.ts.

import { isAsesor, type CurrentUser } from "./auth";

/** Oportunidades y Pedidos: un Asesor solo ve los que tienen su advisorId. */
export function advisorScope(user: CurrentUser): { advisorId?: string } {
  return isAsesor(user) ? { advisorId: user.id } : {};
}

/** Cotizaciones: registradas por él, o de una oportunidad asesorada por él. */
export function quoteScope(user: CurrentUser): {
  OR?: ({ registeredById: string } | { opportunity: { advisorId: string } })[];
} {
  return isAsesor(user)
    ? { OR: [{ registeredById: user.id }, { opportunity: { advisorId: user.id } }] }
    : {};
}
