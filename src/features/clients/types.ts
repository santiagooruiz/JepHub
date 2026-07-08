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

/** Fila de cliente leída en vivo desde el ERP (MTPROCLI). Clave = NIT. */
export type ErpClientRow = {
  nit: string;
  nombre: string;
  tipo: "Empresa" | "Persona";
  email: string;
  telefono: string;
  ciudad: string;
  asesor: string;
  estado: string; // "Cliente" | "Prospecto"
  fechaRegistro: string;
};

export type ErpClientStats = {
  total: number;
  empresas: number;
  personas: number;
  prospectos: number;
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
