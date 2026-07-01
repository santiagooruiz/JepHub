import type { BadgeProps } from "@/components/ui/badge";

export type OrderRow = {
  id: string;
  numero: number;
  cliente: string;
  asesor: string;
  total: string;
  estado: string;
  tipoProducto: string;
};

export const ORDER_ESTADOS = [
  "Pendiente Ingreso",
  "En Producción",
  "Instalación",
  "Pendientes Facturación",
  "Facturado",
  "Denegado",
];

export const APPROVAL_KINDS = [
  "INGRESO",
  "FABRICACION",
  "INSTALACION",
  "FACTURACION",
] as const;
export type ApprovalKind = (typeof APPROVAL_KINDS)[number];

export const APPROVAL_LABELS: Record<ApprovalKind, string> = {
  INGRESO: "Ingreso Pedido",
  FABRICACION: "Fabricación",
  INSTALACION: "Instalación",
  FACTURACION: "Facturación",
};

/** Permiso requerido por cada aprobación ({subject}.{action}). */
export const APPROVAL_PERM: Record<ApprovalKind, string> = {
  INGRESO: "approve_ingreso",
  FABRICACION: "approve_fabricacion",
  INSTALACION: "approve_instalacion",
  FACTURACION: "approve_facturacion",
};

export function orderEstadoVariant(estado: string): BadgeProps["variant"] {
  switch (estado) {
    case "Facturado":
      return "success";
    case "Denegado":
      return "destructive";
    case "En Producción":
    case "Instalación":
      return "default";
    default:
      return "muted";
  }
}
