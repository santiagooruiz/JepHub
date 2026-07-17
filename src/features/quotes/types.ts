import type { BadgeProps } from "@/components/ui/badge";

export type QuoteRow = {
  id: string;
  numero: number;
  cliente: string;
  oportunidad: string;
  registradoPor: string;
  total: string;
  estado: string;
  fecha: string;
};

export const QUOTE_ESTADOS = [
  "Pendiente cotización",
  "Pendiente plano comercial",
  "Pendiente ficha comercial",
  "Enviada",
  "Pendiente Aprobación",
  "Aprobada",
  "Detenida",
  "No aprobada",
];

export function quoteEstadoVariant(estado: string): BadgeProps["variant"] {
  switch (estado) {
    case "Aprobada":
      return "success";
    case "No aprobada":
      return "destructive";
    case "Pendiente Aprobación":
    case "Enviada":
      return "default";
    default:
      return "muted";
  }
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export const IVA_RATE = 0.19;

/**
 * Referencia del ítem ESPECIAL: producto por desarrollar, sin precio (va en 0);
 * solo lleva cantidad, descripción y un archivo opcional. Al guardar una
 * cotización con este código se crea/asegura una solicitud en Backlog Diseño y
 * bloquea generar el pedido hasta que diseño lo resuelva.
 */
export const CODIGO_ESPECIAL = "CODIGO-ESPECIAL";

export function esItemEspecial(referencia: string | null | undefined): boolean {
  return (referencia ?? "").trim().toUpperCase() === CODIGO_ESPECIAL;
}
