// Utilidades compartidas para líneas con carátulas (LineItem.tipo): agrupación
// jerárquica de 1 nivel (carátula → productos hijos) y clonación de filas al
// duplicar cotizaciones o generar pedidos. La fila carátula guarda montos en 0:
// su valor mostrado siempre se deriva de los hijos.

import type { LineItem, Prisma } from "@prisma/client";

type LineItemNode = {
  id: string;
  parentId: string | null;
  tipo: string;
};

export type LineItemGroup<T> = { item: T; hijos: T[] };

/**
 * Agrupa la lista plana de líneas (ya ordenada por `posicion`) en entradas de
 * nivel superior con sus hijos. Una hija cuya carátula no esté en la lista
 * (no debería ocurrir) se muestra suelta al final en lugar de perderse.
 */
export function groupLineItems<T extends LineItemNode>(
  items: T[]
): LineItemGroup<T>[] {
  const groups: LineItemGroup<T>[] = [];
  const byId = new Map<string, LineItemGroup<T>>();
  for (const it of items) {
    if (it.parentId) continue;
    const group: LineItemGroup<T> = { item: it, hijos: [] };
    groups.push(group);
    if (it.tipo === "CARATULA") byId.set(it.id, group);
  }
  for (const it of items) {
    if (!it.parentId) continue;
    const parent = byId.get(it.parentId);
    if (parent) parent.hijos.push(it);
    else groups.push({ item: it, hijos: [] });
  }
  return groups;
}

/** Suma de totales (acepta Decimal de Prisma o number). */
export function sumTotals(
  items: { total: number | { toString(): string } }[]
): number {
  return items.reduce((s, it) => s + Number(it.total), 0);
}

/**
 * Copia líneas hacia otra cotización o pedido: ids nuevos y `parentId`
 * remapeado al id nuevo de su carátula, preservando tipo/posición.
 */
export function cloneLineItemRows(
  items: LineItem[],
  target: { quoteId: string } | { orderId: string }
): Prisma.LineItemCreateManyInput[] {
  const idMap = new Map<string, string>();
  for (const it of items) idMap.set(it.id, globalThis.crypto.randomUUID());
  return items.map((it) => ({
    id: idMap.get(it.id)!,
    ...target,
    tipo: it.tipo,
    parentId: it.parentId ? (idMap.get(it.parentId) ?? null) : null,
    posicion: it.posicion,
    productId: it.productId,
    imagen: it.imagen,
    referencia: it.referencia,
    descripcion: it.descripcion,
    precio: it.precio,
    cantidad: it.cantidad,
    descuentoPct: it.descuentoPct,
    precioConDesc: it.precioConDesc,
    acabados: it.acabados,
    observacionesInternas: it.observacionesInternas,
    total: it.total,
  }));
}

/**
 * Inserta filas de líneas en 2 pasos (nivel superior y luego hijas) para
 * satisfacer la FK autorreferente `parentId` dentro de la transacción.
 */
export async function insertLineItemRows(
  tx: Prisma.TransactionClient,
  rows: Prisma.LineItemCreateManyInput[]
): Promise<void> {
  const parents = rows.filter((r) => !r.parentId);
  const children = rows.filter((r) => r.parentId);
  if (parents.length) await tx.lineItem.createMany({ data: parents });
  if (children.length) await tx.lineItem.createMany({ data: children });
}
