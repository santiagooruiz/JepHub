import { db } from "@/lib/db";
import { clientDisplayName } from "@/features/clients/queries";
import { formatMoney, type BacklogRow, type SpecialCard } from "./types";

const dateFmt = (d: Date | null) =>
  d ? d.toLocaleDateString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" }) : "";

const dateTimeFmt = (d: Date | null) =>
  d
    ? d.toLocaleString("es-CO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

/** Listado del Backlog Diseño (scoped por tenant), mapeado a filas de tabla. */
export async function listDesignRequests(companyId: string): Promise<BacklogRow[]> {
  const clientSelect = {
    select: {
      personType: true,
      nombres: true,
      apellidos: true,
      razonSocial: true,
      nombreComercial: true,
    },
  } as const;

  const rows = await db.designRequest.findMany({
    where: { companyId, deletedAt: null },
    include: {
      quote: {
        select: {
          numero: true,
          estado: true,
          client: clientSelect,
          registeredBy: { select: { name: true } },
        },
      },
      order: {
        select: {
          numero: true,
          estado: true,
          client: clientSelect,
          advisor: { select: { name: true } },
        },
      },
      designer: { select: { name: true } },
    },
    orderBy: { numero: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    numero: r.numero,
    tipo: r.order
      ? `Pedido #${r.order.numero}`
      : r.quote
        ? `Cotización N° ${r.quote.numero}`
        : "[INTERNO]",
    origenEstado: r.order?.estado ?? r.quote?.estado ?? "",
    quoteId: r.quoteId,
    orderId: r.orderId,
    imagen: r.imagen,
    cliente: r.order
      ? clientDisplayName(r.order.client)
      : r.quote
        ? clientDisplayName(r.quote.client)
        : "[INTERNO]",
    asesor: r.order?.advisor?.name ?? r.quote?.registeredBy?.name ?? "",
    fechaSolicitud: dateTimeFmt(r.createdAt),
    descripcion: r.descripcion ?? "",
    datosEntrada: r.datosEntrada ?? "",
    requisitosTecnicos: r.requisitosTecnicos ?? "",
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

/**
 * Detalle para el panel 👁️ del backlog (tabs Información / Archivos /
 * Mensajes / Histórico), con archivos y actividades incluidos.
 */
export async function getDesignRequestDetail(companyId: string, id: string) {
  const dr = await db.designRequest.findFirst({
    where: { id, companyId, deletedAt: null },
    include: {
      quote: {
        select: {
          id: true,
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
      order: {
        select: {
          id: true,
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
          advisor: { select: { name: true } },
        },
      },
      designer: { select: { name: true } },
      requestedBy: { select: { name: true } },
      special: { select: { id: true, codigo: true } },
      messages: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!dr) return null;

  const [files, activities] = await Promise.all([
    db.attachment.findMany({
      where: { designRequestId: dr.id, companyId, entityType: "DESIGN" },
      orderBy: { createdAt: "desc" },
    }),
    db.activity.findMany({
      where: { designRequestId: dr.id, companyId },
      include: { user: { select: { name: true } } },
      orderBy: { fechaHora: "desc" },
    }),
  ]);

  return { ...dr, files, activities };
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
