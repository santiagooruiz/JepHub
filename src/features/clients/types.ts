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

export type ErpClientContact = {
  nombre: string;
  cargo: string;
  telefono: string;
  direccion: string;
};

/** Ficha del cliente leída del ERP (MTPROCLI), con nombres resueltos. */
export type ErpClientDetail = {
  nit: string;
  nombre: string;
  tipo: "Empresa" | "Persona";
  estado: string;
  email: string;
  emailAlt: string;
  tel1: string;
  tel2: string;
  direccion: string;
  ciudad: string;
  web: string;
  asesor: string;
  canal: string;
  esProveedor: boolean;
  habilitado: boolean;
  plazo: number;
  cupoCredito: number;
  fechaIngreso: string;
  contactoPrincipal: string;
  contacts: ErpClientContact[];
};

/** Documento con saldo pendiente en cartera (fnvOF_ReporteCartera_jep2). */
export type ErpCarteraDoc = {
  tipo: string;
  documento: string;
  fVencim: string;
  diasVenc: number;
  saldo: number;
};

export type ErpClientCartera = {
  totalSaldo: number;
  docs: ErpCarteraDoc[];
  aging: { porVencer: number; d0_30: number; d31_60: number; d61_90: number; d91: number };
};

/** Renglón de los tabs Cotizaciones (CV) / Pedidos (PD), leídos de TRADE. */
export type ErpClientDocRow = {
  numero: string;
  fecha: string;
  valor: number;
  orden: string;
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
