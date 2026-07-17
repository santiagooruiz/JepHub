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

/**
 * Selección de un acabado del ERP para una línea: el acabado que lleva el
 * producto (ZPROACA/ZACABADOS) y el material/color elegido (MTMERCIA por
 * CLASIFICA2). `opcionCodigo` null = POR DEFINIR.
 */
export type AcabadoSel = {
  codigo: string;
  nombre: string;
  opcionCodigo: string | null;
  opcionNombre: string | null;
  opcionColor: string | null;
};

/** Lee `LineItem.acabadosJson` con tolerancia a datos viejos/malformados. */
export function parseAcabadosJson(v: unknown): AcabadoSel[] | null {
  if (!Array.isArray(v)) return null;
  const out: AcabadoSel[] = [];
  for (const e of v) {
    if (!e || typeof e !== "object") continue;
    const o = e as Record<string, unknown>;
    if (typeof o.codigo !== "string" || typeof o.nombre !== "string") continue;
    const str = (k: string) =>
      typeof o[k] === "string" && o[k] ? (o[k] as string) : null;
    out.push({
      codigo: o.codigo,
      nombre: o.nombre,
      opcionCodigo: str("opcionCodigo"),
      opcionNombre: str("opcionNombre"),
      opcionColor: str("opcionColor"),
    });
  }
  return out.length || v.length === 0 ? out : null;
}

/**
 * Texto de medidas de un producto de área ("Largo 1,20 × Ancho 0,60 · Figura")
 * para detalle/PDF/correo. null si no hay nada que mostrar.
 */
export function medidasToString(m: {
  esArea: boolean;
  largo: number | null;
  ancho: number | null;
  figura: boolean;
}): string | null {
  if (!m.esArea || (m.largo === null && m.ancho === null && !m.figura)) {
    return null;
  }
  const fmt = (n: number | null) =>
    n === null ? "—" : n.toLocaleString("es-CO", { maximumFractionDigits: 2 });
  const partes = [`Largo ${fmt(m.largo)} × Ancho ${fmt(m.ancho)}`];
  if (m.figura) partes.push("Figura");
  return partes.join(" · ");
}

/**
 * String de acabados que se muestra/imprime, derivado de las selecciones.
 * Un acabado sin opción queda "POR DEFINIR" (bloquea generar el pedido).
 */
export function acabadosToString(sel: AcabadoSel[]): string {
  return sel
    .map(
      (a) =>
        `${a.nombre}: ${
          a.opcionCodigo
            ? `${a.opcionNombre ?? a.opcionCodigo} [${a.opcionCodigo}]`
            : "POR DEFINIR"
        }`
    )
    .join(" · ");
}

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
    acabadosJson:
      it.acabadosJson === null
        ? undefined
        : (it.acabadosJson as Prisma.InputJsonValue),
    esArea: it.esArea,
    largo: it.largo,
    ancho: it.ancho,
    figura: it.figura,
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
