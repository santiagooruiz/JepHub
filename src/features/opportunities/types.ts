import type { BadgeProps } from "@/components/ui/badge";

export type OppRow = {
  id: string;
  numero: number;
  nombre: string;
  cliente: string;
  asesor: string;
  estado: string;
  probabilidad: string;
  fechaCierre: string;
};

export const OPP_ESTADOS = [
  "No Cotizada",
  "Pendiente Aprobación",
  "Cotizada",
  "Perdida",
];

export function oppEstadoVariant(estado: string): BadgeProps["variant"] {
  switch (estado) {
    case "Cotizada":
      return "success";
    case "Perdida":
      return "destructive";
    case "Pendiente Aprobación":
      return "default";
    default:
      return "muted";
  }
}

export function probLabel(p: string): string {
  return p === "HIGH"
    ? "Alta Probabilidad"
    : p === "FIXED"
      ? "Fijo"
      : "Sin Definir";
}
