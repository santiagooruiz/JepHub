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

export type BacklogRow = {
  id: string;
  numero: number;
  tipo: string; // "[INTERNO]" o "Cotización N°…"
  quoteId: string | null;
  imagen: string | null;
  cliente: string;
  asesor: string;
  fechaSolicitud: string;
  descripcion: string;
  nPedidoOfimatica: string;
  disenador: string;
  estado: string;
  despiece: boolean;
  armadoGeneral: boolean;
  planosTecnicos: boolean;
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
