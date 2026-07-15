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

// ── Seguimiento informativo del ERP ──
// Los "aprobados" ya NO se gestionan en JEP-Hub: los procesos ocurren en el ERP
// (ofimática). Aquí solo se refleja el avance a partir de los datos del ERP:
//   · Ingreso Pedido → el ERP generó el PEDIDO (PD) a partir de nuestra CV.
//   · Fabricación    → hitos de producción Tapicería (ZFTAPI) / Listo (ZFLISTO).
//   · Instalación    → hito Despacho (ZFDESPA).
//   · Facturación    → estado del pedido = "Facturado".
export type ErpProgressState = "completado" | "en_proceso" | "pendiente";

export type ErpApprovalStatus = {
  kind: ApprovalKind;
  estado: ErpProgressState;
  fecha: Date | null;
};

export type ErpMilestoneDates = {
  nroPedidoErp: string | null;
  fechaTapiceria: Date | null;
  fechaListo: Date | null;
  fechaDespacho: Date | null;
};

/** Deriva el estado informativo de cada etapa a partir de los datos del ERP. */
export function deriveErpApprovals(
  erp: ErpMilestoneDates | null,
  estadoPedido: string
): ErpApprovalStatus[] {
  return [
    {
      kind: "INGRESO",
      estado: erp?.nroPedidoErp ? "completado" : "pendiente",
      fecha: null,
    },
    {
      kind: "FABRICACION",
      estado: erp?.fechaListo
        ? "completado"
        : erp?.fechaTapiceria
          ? "en_proceso"
          : "pendiente",
      fecha: erp?.fechaListo ?? erp?.fechaTapiceria ?? null,
    },
    {
      kind: "INSTALACION",
      estado: erp?.fechaDespacho ? "completado" : "pendiente",
      fecha: erp?.fechaDespacho ?? null,
    },
    {
      kind: "FACTURACION",
      estado: estadoPedido === "Facturado" ? "completado" : "pendiente",
      fecha: null,
    },
  ];
}

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
