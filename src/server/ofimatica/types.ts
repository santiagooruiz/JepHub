// Tipos de hitos ofimática. Módulo sin dependencias de BullMQ para que el
// webhook y la capa web no arrastren la cola/Redis al bundle.
export type Hito = "tapiceria" | "listo" | "despacho";

export const HITOS: Hito[] = ["tapiceria", "listo", "despacho"];

export const HITO_LABEL: Record<Hito, string> = {
  tapiceria: "Tapicería",
  listo: "Listo",
  despacho: "Despacho",
};

export const HITO_FIELD: Record<Hito, "fechaTapiceria" | "fechaListo" | "fechaDespacho"> = {
  tapiceria: "fechaTapiceria",
  listo: "fechaListo",
  despacho: "fechaDespacho",
};

export function isHito(v: unknown): v is Hito {
  return v === "tapiceria" || v === "listo" || v === "despacho";
}
