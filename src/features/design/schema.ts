import { z } from "zod";

const opt = z.string().trim().optional().nullable();

/** Campos de planificación de diseño & desarrollo (PR-DI-01). */
export const designPlanningSchema = z.object({
  id: z.string().optional(),
  descripcion: opt,
  imagen: opt,
  datosEntrada: opt,
  requisitosTecnicos: opt,
  requisitosFuncionales: opt,
  posiblesFallos: opt,
  requisitosLegales: opt,
  disenosPrevios: opt,
});
export type DesignPlanningInput = z.infer<typeof designPlanningSchema>;

/** Entregables de diseño (URL/nombre de archivo). */
export const entregablesSchema = z.object({
  id: z.string().min(1),
  despiece: opt,
  armadoGeneral: opt,
  planosTecnicos: opt,
  nPedidoOfimatica: opt,
});

/** Edición de la ficha de un diseño especial. */
export const specialSchema = z.object({
  id: z.string().min(1),
  codigo: z.string().trim().min(1, "Código requerido"),
  tipo: opt,
  descripcion: opt,
  imagen: opt,
  estado: z.string().trim().min(1, "Estado requerido"),
  precioVentaPublico: z.coerce.number().nonnegative().optional().nullable(),
  precioVentaDto: z.coerce.number().nonnegative().optional().nullable(),
  cantRequerida: z.coerce.number().int().nonnegative().optional().nullable(),
});

export const messageSchema = z.object({
  specialDesignId: z.string().min(1),
  body: z.string().trim().min(1, "Mensaje vacío"),
});

export const specialFileSchema = z.object({
  specialDesignId: z.string().min(1),
  tipoArchivo: opt,
  observaciones: opt,
  url: z.string().trim().min(1, "URL o nombre requerido"),
});
