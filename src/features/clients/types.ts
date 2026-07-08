import type { BadgeProps } from "@/components/ui/badge";

export type ClientRow = {
  id: string;
  numero: number;
  nombre: string;
  documento: string;
  tipo: string;
  email: string;
  telefono: string;
  asesor: string;
  estado: string;
  ultimaInteraccion: string;
  dias: number | null;
  accion: string;
  canal: string;
  fechaRegistro: string;
};

export function estadoVariant(estado: string): BadgeProps["variant"] {
  switch (estado) {
    case "Cliente":
      return "success";
    case "Gestión Perdida":
      return "destructive";
    case "Gestión Cotización":
      return "default";
    default:
      return "muted";
  }
}
