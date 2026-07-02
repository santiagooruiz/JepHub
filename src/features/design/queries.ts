import { db } from "@/lib/db";
import { clientDisplayName } from "@/features/clients/queries";
import { formatMoney, type BacklogRow, type SpecialCard } from "./types";

const dateFmt = (d: Date | null) =>
  d ? d.toLocaleDateString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" }) : "";

/** Listado del Backlog Diseño (scoped por tenant), mapeado a filas de tabla. */
export async function listDesignRequests(companyId: string): Promise<BacklogRow[]> {
  const rows = await db.designRequest.findMany({
    where: { companyId, deletedAt: null },
    include: {
      quote: {
        select: {
          numero: true,
          estado: true,
          client: {
            select: {
              personType: true,
              nombres: true,
              apellidos: true,
              razonSocial: true,
              nombreComercial: true,
            },
          },
          registeredBy: { select: { name: true } },
        },
      },
      designer: { select: { name: true } },
    },
    orderBy: { numero: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    numero: r.numero,
    tipo: r.quote ? `Cotización N° ${r.quote.numero} (${r.quote.estado})` : "[INTERNO]",
    quoteId: r.quoteId,
    imagen: r.imagen,
    cliente: r.quote ? clientDisplayName(r.quote.client) : "[INTERNO]",
    asesor: r.quote?.registeredBy?.name ?? "",
    fechaSolicitud: dateFmt(r.createdAt),
    descripcion: r.descripcion ?? r.datosEntrada ?? "",
    nPedidoOfimatica: r.nPedidoOfimatica ?? "",
    disenador: r.designer?.name ?? "",
    estado: r.estado,
    despiece: !!r.despiece,
    armadoGeneral: !!r.armadoGeneral,
    planosTecnicos: !!r.planosTecnicos,
  }));
}

export async function getDesignRequest(companyId: string, id: string) {
  return db.designRequest.findFirst({
    where: { id, companyId, deletedAt: null },
    include: {
      quote: { select: { id: true, numero: true, estado: true } },
      designer: { select: { name: true } },
      special: { select: { id: true, codigo: true } },
    },
  });
}

/** Usuarios de la empresa (para el select de diseñador). */
export async function listCompanyUsers(companyId: string) {
  return db.user.findMany({
    where: { companyId, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listSpecialDesigns(companyId: string): Promise<SpecialCard[]> {
  const rows = await db.specialDesign.findMany({
    where: { companyId },
    include: {
      creador: { select: { name: true } },
      order: { select: { numero: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((s) => ({
    id: s.id,
    codigo: s.codigo,
    tipo: s.tipo ?? (s.order ? "CONVERTIDA A PEDIDO" : ""),
    asesor: s.creador?.name ?? "",
    fecha: dateFmt(s.createdAt),
    precio: s.precioVentaPublico != null ? formatMoney(Number(s.precioVentaPublico)) : "—",
    descripcion: s.descripcion ?? "",
    imagen: s.imagen,
    estado: s.estado,
  }));
}

export async function getSpecialDesign(companyId: string, id: string) {
  return db.specialDesign.findFirst({
    where: { id, companyId },
    include: {
      creador: { select: { name: true } },
      order: { select: { id: true, numero: true } },
      designRequest: { select: { id: true, numero: true } },
      messages: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
