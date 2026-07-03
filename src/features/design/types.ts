import type { BadgeProps } from "@/components/ui/badge";

export { formatMoney } from "@/features/quotes/types";

// Estados del Backlog Diseño (proceso PR-DI-01), en orden de flujo.
export const BACKLOG_ESTADOS = [
  "PT precio comercial",
  "Especial sin aprobar cliente",
  "PT asignar diseñador",
  "PT Ficha Técnica",
  "PT Aprobación FT",
  "Proceso de diseño",
  "Pendiente Validación",
  "Rechazados",
  "Finalizados",
];

/** Estado en el que un diseño puede promoverse a Biblioteca Especiales. */
export const BACKLOG_ESTADO_FINAL = "Finalizados";

export function backlogEstadoVariant(estado: string): BadgeProps["variant"] {
  switch (estado) {
    case "Finalizados":
      return "success";
    case "Rechazados":
      return "destructive";
    case "Proceso de diseño":
    case "Pendiente Validación":
      return "default";
    default:
      return "muted";
  }
}

export const SPECIAL_ESTADOS = [
  "EN DISEÑO",
  "CONVERTIDA A PEDIDO",
  "FACTURADO",
];

export function specialEstadoVariant(estado: string): BadgeProps["variant"] {
  switch (estado) {
    case "FACTURADO":
      return "success";
    case "CONVERTIDA A PEDIDO":
      return "default";
    default:
      return "muted";
  }
}

/**
 * Categorías de archivo de una solicitud de diseño (tab "Archivos"), según el
 * checklist del CRM original. Las tres marcadas como entregable alimentan las
 * columnas ✓ Despiece / Armado / Planos del listado.
 */
export const DESIGN_FILE_CATEGORIES = [
  "Ficha Comercial",
  "Ficha Técnica / Ficha de ajuste",
  "Despiece",
  "Armado general",
  "Planos Técnicos",
  "Soporte de precio",
  "Archivo de validación",
  "Soporte datos de entrada",
] as const;

export type DesignFileCategory = (typeof DESIGN_FILE_CATEGORIES)[number];

/** Categoría de archivo → campo entregable de DesignRequest (si aplica). */
export const DELIVERABLE_BY_CATEGORY: Partial<
  Record<DesignFileCategory, "despiece" | "armadoGeneral" | "planosTecnicos">
> = {
  Despiece: "despiece",
  "Armado general": "armadoGeneral",
  "Planos Técnicos": "planosTecnicos",
};

export type BacklogRow = {
  id: string;
  numero: number;
  tipo: string; // "[INTERNO]", "Cotización N°…" o "Pedido #…"
  origenEstado: string; // estado de la cotización/pedido de origen (si aplica)
  quoteId: string | null;
  orderId: string | null;
  imagen: string | null;
  cliente: string;
  asesor: string;
  fechaSolicitud: string;
  descripcion: string;
  datosEntrada: string;
  requisitosTecnicos: string;
  nPedidoOfimatica: string;
  disenador: string;
  estado: string;
  // Entregables: un chip por archivo de la categoría (azul si ya validado)
  despiece: DeliverableChip[];
  armadoGeneral: DeliverableChip[];
  planosTecnicos: DeliverableChip[];
};

export type DeliverableChip = {
  url: string;
  aprobado: boolean;
};

export type SpecialCard = {
  id: string;
  codigo: string;
  tipo: string;
  asesor: string;
  fecha: string;
  precio: string;
  descripcion: string;
  imagen: string | null;
  estado: string;
};
