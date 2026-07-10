import { db } from "@/lib/db";

/**
 * Valores (strings) de un parámetro-catálogo `{ id, value, icon?, color? }[]`
 * del módulo Parámetros. Si el parámetro no existe o está vacío, retorna el
 * fallback (los estados son data, no constantes — CLAUDE.md).
 */
export async function getParamValues(
  companyId: string,
  key: string,
  fallback: string[]
): Promise<string[]> {
  const param = await db.parameter.findUnique({
    where: { companyId_key: { companyId, key } },
  });
  const values = Array.isArray(param?.value)
    ? (param!.value as { value?: string }[])
        .map((v) => v.value ?? "")
        .filter(Boolean)
    : [];
  return values.length ? values : fallback;
}

export const ACTION_ACTIVITIES_FALLBACK = [
  "Llamada",
  "Visita",
  "Email",
  "Observación",
];

// Catálogo del CRM original (select "Tipo Archivo" al subir un adjunto).
export const FILE_TYPES_FALLBACK = [
  "Ficha técnica (aprobación cliente)",
  "Plano comercial (aprobación cliente)",
  "Contrato",
  "Documentos de apoyo",
  "Orden de compra",
  "Soporte de pago",
];
