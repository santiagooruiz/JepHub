"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requirePermission, requireUser } from "@/lib/guard";
import type { ActionResult } from "@/features/config/actions";
import { clientDisplayName } from "@/features/clients/queries";
import {
  BACKLOG_ESTADOS,
  BACKLOG_ESTADO_FINAL,
  DELIVERABLE_BY_CATEGORY,
  REQUESTER_UPLOAD_CATEGORIES,
  formatMoney,
} from "./types";
import {
  designPlanningSchema,
  entregablesSchema,
  specialSchema,
  messageSchema,
  specialFileSchema,
  designMessageSchema,
  designFileSchema,
  designPrecioSchema,
} from "./schema";
import { applyDesignFileEffects } from "./file-effects";
import { notifyDesignersNewRequest } from "./notify";

/** Registra un evento automático en el histórico de una entidad de diseño. */
async function logDesignActivity(
  companyId: string,
  userId: string,
  entity: "DESIGN" | "SPECIAL",
  entityId: string,
  accion: string,
  observaciones?: string
) {
  await db.activity.create({
    data: {
      companyId,
      entityType: entity,
      ...(entity === "DESIGN"
        ? { designRequestId: entityId }
        : { specialDesignId: entityId }),
      accion,
      fechaHora: new Date(),
      observaciones: observaciones ?? null,
      userId,
      auto: true,
    },
  });
}

async function nextNumero(companyId: string): Promise<number> {
  const last = await db.designRequest.findFirst({
    where: { companyId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  return (last?.numero ?? 0) + 1;
}

/**
 * "Solicitar planos/cambios": envía una cotización a la cola de diseño. La
 * descripción es obligatoria (el diálogo del cliente ya no permite enviar
 * sin ella ni sin adjuntar el levantamiento) para que diseño nunca reciba
 * una solicitud sin la información necesaria para atenderla.
 */
export async function requestDesign(
  quoteId: string,
  descripcion: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requirePermission("create", "backlog_design");
  const trimmed = descripcion.trim();
  if (!trimmed) return { ok: false, error: "La descripción es obligatoria." };

  const quote = await db.quote.findFirst({
    where: { id: quoteId, companyId: user.companyId, deletedAt: null },
    include: {
      // Primer producto real (las carátulas son títulos, no precargan diseño).
      items: {
        take: 1,
        where: { tipo: "PRODUCTO" },
        orderBy: [{ posicion: "asc" }, { id: "asc" }],
      },
      client: {
        select: {
          personType: true,
          nombres: true,
          apellidos: true,
          razonSocial: true,
          nombreComercial: true,
        },
      },
      designRequests: {
        where: { deletedAt: null },
        select: { id: true },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });
  if (!quote) return { ok: false, error: "Cotización no encontrada." };
  if (quote.designRequests[0]) return { ok: true, id: quote.designRequests[0].id };

  const first = quote.items[0];
  const dr = await db.designRequest.create({
    data: {
      companyId: user.companyId,
      numero: await nextNumero(user.companyId),
      quoteId: quote.id,
      clientId: quote.clientId,
      requestedById: user.id,
      imagen: first?.imagen ?? null,
      descripcion: trimmed,
      datosEntrada: first?.observacionesInternas ?? null,
    },
  });

  await Promise.all([
    logDesignActivity(user.companyId, user.id, "DESIGN", dr.id, "Solicitud creada desde cotización"),
    db.activity.create({
      data: {
        companyId: user.companyId,
        entityType: "QUOTE",
        quoteId: quote.id,
        accion: "Solicitó planos a diseño",
        fechaHora: new Date(),
        userId: user.id,
        auto: true,
      },
    }),
    notifyDesignersNewRequest({
      companyId: user.companyId,
      designRequestId: dr.id,
      numero: dr.numero,
      descripcion: dr.descripcion,
      clienteNombre: clientDisplayName(quote.client),
      asesorNombre: user.name,
    }),
  ]);

  revalidatePath("/backlog");
  revalidatePath(`/cotizaciones/${quoteId}`);
  return { ok: true, id: dr.id };
}

/**
 * "Solicitar cambio": sobre una solicitud de "Solicitar planos/cambios" ya
 * cerrada (Finalizados), abre una nueva versión encadenada en vez de
 * reabrir la anterior, preservando el histórico/archivos de cada versión.
 */
export async function requestDesignChange(
  previousRequestId: string,
  descripcion: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requirePermission("create", "backlog_design");
  const trimmed = descripcion.trim();
  if (!trimmed) return { ok: false, error: "La descripción es obligatoria." };

  const previous = await db.designRequest.findFirst({
    where: { id: previousRequestId, companyId: user.companyId, deletedAt: null },
    include: {
      nextRequest: { select: { id: true } },
      quote: {
        select: {
          client: {
            select: {
              personType: true,
              nombres: true,
              apellidos: true,
              razonSocial: true,
              nombreComercial: true,
            },
          },
        },
      },
    },
  });
  if (!previous) return { ok: false, error: "Solicitud no encontrada." };
  if (!previous.quoteId) {
    return { ok: false, error: "Solo se puede solicitar un cambio sobre solicitudes de cotización." };
  }
  if (previous.nextRequest) return { ok: true, id: previous.nextRequest.id };
  if (previous.estado !== BACKLOG_ESTADO_FINAL) {
    return { ok: false, error: `La solicitud debe estar en "${BACKLOG_ESTADO_FINAL}" para solicitar un cambio.` };
  }

  const dr = await db.designRequest.create({
    data: {
      companyId: user.companyId,
      numero: await nextNumero(user.companyId),
      quoteId: previous.quoteId,
      clientId: previous.clientId,
      requestedById: user.id,
      imagen: previous.imagen,
      descripcion: trimmed,
      datosEntrada: previous.datosEntrada,
      version: previous.version + 1,
      previousRequestId: previous.id,
    },
  });

  await Promise.all([
    logDesignActivity(
      user.companyId,
      user.id,
      "DESIGN",
      dr.id,
      `Solicitud de cambio (versión ${dr.version}) creada a partir del Diseño N°${previous.numero}`
    ),
    db.activity.create({
      data: {
        companyId: user.companyId,
        entityType: "QUOTE",
        quoteId: previous.quoteId,
        accion: `Solicitó un cambio de diseño (versión ${dr.version})`,
        fechaHora: new Date(),
        userId: user.id,
        auto: true,
      },
    }),
    notifyDesignersNewRequest({
      companyId: user.companyId,
      designRequestId: dr.id,
      numero: dr.numero,
      descripcion: dr.descripcion,
      clienteNombre: previous.quote?.client ? clientDisplayName(previous.quote.client) : null,
      asesorNombre: user.name,
      cambio: true,
    }),
  ]);

  revalidatePath("/backlog");
  revalidatePath(`/backlog/${previousRequestId}`);
  revalidatePath(`/cotizaciones/${previous.quoteId}`);
  return { ok: true, id: dr.id };
}

/**
 * "Solicitar ficha técnica": envía un pedido a la cola de diseño (entra
 * directo en el estado "PT Ficha Técnica").
 */
export async function requestFichaTecnica(
  orderId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requirePermission("create", "backlog_design");

  const order = await db.order.findFirst({
    where: { id: orderId, companyId: user.companyId, deletedAt: null },
    include: {
      // Primer producto real (las carátulas son títulos, no precargan diseño).
      items: {
        take: 1,
        where: { tipo: "PRODUCTO" },
        orderBy: [{ posicion: "asc" }, { id: "asc" }],
      },
      designRequests: { where: { deletedAt: null }, select: { id: true }, take: 1 },
    },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (order.designRequests[0]) return { ok: true, id: order.designRequests[0].id };

  const first = order.items[0];
  const dr = await db.designRequest.create({
    data: {
      companyId: user.companyId,
      numero: await nextNumero(user.companyId),
      orderId: order.id,
      clientId: order.clientId,
      requestedById: user.id,
      imagen: first?.imagen ?? null,
      descripcion: first?.descripcion ?? null,
      estado: "PT Ficha Técnica",
    },
  });

  await Promise.all([
    logDesignActivity(
      user.companyId,
      user.id,
      "DESIGN",
      dr.id,
      "Solicitud de ficha técnica creada desde pedido"
    ),
    db.activity.create({
      data: {
        companyId: user.companyId,
        entityType: "ORDER",
        orderId: order.id,
        accion: "Solicitó ficha técnica a diseño",
        fechaHora: new Date(),
        userId: user.id,
        auto: true,
      },
    }),
  ]);

  revalidatePath("/backlog");
  revalidatePath(`/pedidos/${orderId}`);
  return { ok: true, id: dr.id };
}

/** Producto [INTERNO]: nueva solicitud de diseño con formato PR-DI-01. */
export async function createInternalDesign(
  input: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requirePermission("create", "backlog_design");
  const parsed = designPlanningSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { id: _ignore, ...data } = parsed.data;
  void _ignore;

  const dr = await db.designRequest.create({
    data: {
      companyId: user.companyId,
      numero: await nextNumero(user.companyId),
      interno: true,
      requestedById: user.id,
      ...data,
    },
  });
  await logDesignActivity(user.companyId, user.id, "DESIGN", dr.id, "Producto interno creado");
  revalidatePath("/backlog");
  return { ok: true, id: dr.id };
}

export async function updateDesignPlanning(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("edit", "backlog_design");
  const parsed = designPlanningSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { id, ...data } = parsed.data;
  if (!id) return { ok: false, error: "Falta el identificador." };

  const { count } = await db.designRequest.updateMany({
    where: { id, companyId: user.companyId },
    data,
  });
  if (!count) return { ok: false, error: "No encontrado." };
  revalidatePath(`/backlog/${id}`);
  return { ok: true };
}

export async function updateEntregables(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("edit", "backlog_design");
  const parsed = entregablesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { id, ...data } = parsed.data;
  const { count } = await db.designRequest.updateMany({
    where: { id, companyId: user.companyId },
    data,
  });
  if (!count) return { ok: false, error: "No encontrado." };
  await logDesignActivity(user.companyId, user.id, "DESIGN", id, "Entregables actualizados");

  // Avisa al solicitante (p.ej. el Consultor que pidió el despiece) que ya
  // puede consultar/descargar los entregables.
  const dr = await db.designRequest.findFirst({
    where: { id, companyId: user.companyId },
    select: { numero: true, descripcion: true, requestedById: true },
  });
  if (dr?.requestedById && dr.requestedById !== user.id) {
    const subidos = [
      data.despiece && "despiece",
      data.armadoGeneral && "armado general",
      data.planosTecnicos && "planos técnicos",
    ].filter(Boolean).join(", ");
    await db.notification.create({
      data: {
        companyId: user.companyId,
        userId: dr.requestedById,
        tipo: "diseño",
        titulo: `Diseño N°${dr.numero}: entregables disponibles`,
        cuerpo: subidos
          ? `${user.name} subió ${subidos}${dr.descripcion ? ` · ${dr.descripcion}` : ""}.`
          : `${user.name} actualizó los entregables${dr.descripcion ? ` · ${dr.descripcion}` : ""}.`,
        href: `/backlog/${id}`,
      },
    });
  }

  revalidatePath(`/backlog/${id}`);
  return { ok: true };
}

export async function assignDesigner(
  id: string,
  designerId: string
): Promise<ActionResult> {
  const user = await requirePermission("assign_designer", "backlog_design");
  const designer = designerId
    ? await db.user.findFirst({
        where: { id: designerId, companyId: user.companyId },
        select: { id: true, name: true },
      })
    : null;
  if (designerId && !designer) return { ok: false, error: "Diseñador inválido." };

  const { count } = await db.designRequest.updateMany({
    where: { id, companyId: user.companyId },
    data: { designerId: designer?.id ?? null },
  });
  if (!count) return { ok: false, error: "No encontrado." };
  await logDesignActivity(
    user.companyId,
    user.id,
    "DESIGN",
    id,
    designer ? `Diseñador asignado: ${designer.name}` : "Diseñador retirado"
  );
  revalidatePath(`/backlog/${id}`);
  return { ok: true };
}

export async function updateDesignState(
  id: string,
  estado: string
): Promise<ActionResult> {
  const user = await requirePermission("edit", "backlog_design");
  if (!BACKLOG_ESTADOS.includes(estado)) {
    return { ok: false, error: "Estado inválido." };
  }
  const { count } = await db.designRequest.updateMany({
    where: { id, companyId: user.companyId },
    data: { estado },
  });
  if (!count) return { ok: false, error: "No encontrado." };
  await logDesignActivity(user.companyId, user.id, "DESIGN", id, `Estado: ${estado}`);
  revalidatePath(`/backlog/${id}`);
  revalidatePath("/backlog");
  return { ok: true };
}

/** Promueve un diseño Finalizado a la Biblioteca Especiales. */
export async function convertToSpecial(
  id: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requirePermission("create", "special_designs");
  const dr = await db.designRequest.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    include: { special: { select: { id: true } } },
  });
  if (!dr) return { ok: false, error: "No encontrado." };
  if (dr.special) return { ok: true, id: dr.special.id };
  if (dr.estado !== BACKLOG_ESTADO_FINAL) {
    return { ok: false, error: `El diseño debe estar en "${BACKLOG_ESTADO_FINAL}".` };
  }

  const special = await db.specialDesign.create({
    data: {
      companyId: user.companyId,
      codigo: `ESP-${dr.numero}`,
      designRequestId: dr.id,
      creadorId: dr.designerId ?? user.id,
      descripcion: dr.descripcion,
      imagen: dr.imagen,
      precioVentaPublico: dr.precioVentaPublico,
      precioVentaDto: dr.precioVentaDto,
      cantRequerida: dr.cantRequerida,
    },
  });
  await logDesignActivity(
    user.companyId,
    user.id,
    "SPECIAL",
    special.id,
    `Creado desde Backlog N° ${dr.numero}`
  );
  revalidatePath("/especiales");
  revalidatePath(`/backlog/${id}`);
  return { ok: true, id: special.id };
}

/**
 * Precio comercial del producto (etapa "PT precio comercial"). El cambio de
 * precio público queda en el histórico, como en el CRM original.
 */
export async function updateDesignPrecio(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("edit", "backlog_design");
  const parsed = designPrecioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { id, ...data } = parsed.data;

  const dr = await db.designRequest.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    select: { precioVentaPublico: true },
  });
  if (!dr) return { ok: false, error: "No encontrado." };

  await db.designRequest.update({ where: { id }, data });

  const antes = dr.precioVentaPublico != null ? Number(dr.precioVentaPublico) : null;
  if (data.precioVentaPublico != null && data.precioVentaPublico !== antes) {
    await logDesignActivity(
      user.companyId,
      user.id,
      "DESIGN",
      id,
      `${antes == null ? "Agregó" : "Actualizó"} el precio comercial del producto ${formatMoney(data.precioVentaPublico)}`
    );
  }

  revalidatePath("/backlog");
  revalidatePath(`/backlog/${id}`);
  return { ok: true };
}

/** Mensaje en el chat interno de una solicitud del backlog (tab "Mensajes"). */
export async function postDesignMessage(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("view", "backlog_design");
  const parsed = designMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { designRequestId, body } = parsed.data;
  const found = await db.designRequest.findFirst({
    where: { id: designRequestId, companyId: user.companyId, deletedAt: null },
    select: { id: true },
  });
  if (!found) return { ok: false, error: "No encontrado." };

  await db.designRequestMessage.create({
    data: { designRequestId, userId: user.id, body },
  });
  revalidatePath("/backlog");
  return { ok: true };
}

/**
 * Registra un archivo del backlog por categoría (tab "Archivos"). El
 * diseñador (edit) puede subir cualquier categoría; quien solo solicitó el
 * plano (create) solo puede adjuntar sus propias categorías (Levantamiento).
 */
export async function saveDesignFile(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = designFileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { designRequestId, tipoArchivo, observaciones, url } = parsed.data;
  const canEdit = user.ability.can("edit", "backlog_design");
  const canCreate = user.ability.can("create", "backlog_design");
  if (!canEdit && !(canCreate && REQUESTER_UPLOAD_CATEGORIES.includes(tipoArchivo))) {
    return { ok: false, error: "No autorizado." };
  }
  const dr = await db.designRequest.findFirst({
    where: { id: designRequestId, companyId: user.companyId, deletedAt: null },
    select: { id: true },
  });
  if (!dr) return { ok: false, error: "No encontrado." };

  await db.attachment.create({
    data: {
      companyId: user.companyId,
      entityType: "DESIGN",
      designRequestId,
      tipoArchivo,
      observaciones: observaciones?.trim() || null,
      bucket: "archivos",
      url,
    },
  });
  await applyDesignFileEffects(
    user.companyId,
    user.id,
    user.name,
    designRequestId,
    tipoArchivo,
    url
  );

  revalidatePath("/backlog");
  revalidatePath(`/backlog/${designRequestId}`);
  return { ok: true };
}

/**
 * Borrado suave: el archivo queda visible como [BORRADA] para trazabilidad,
 * como en el CRM original. Si era el entregable vigente, desmarca el ✓.
 */
export async function deleteDesignFile(id: string): Promise<ActionResult> {
  const user = await requirePermission("edit", "backlog_design");
  const file = await db.attachment.findFirst({
    where: { id, companyId: user.companyId, entityType: "DESIGN", deletedAt: null },
    select: { id: true, url: true, tipoArchivo: true, designRequestId: true },
  });
  if (!file) return { ok: false, error: "No encontrado." };

  await db.attachment.update({
    where: { id: file.id },
    data: { deletedAt: new Date() },
  });

  if (file.designRequestId) {
    const field =
      DELIVERABLE_BY_CATEGORY[file.tipoArchivo as keyof typeof DELIVERABLE_BY_CATEGORY];
    if (field) {
      // Desmarca el entregable solo si apuntaba a este archivo.
      await db.designRequest.updateMany({
        where: {
          id: file.designRequestId,
          companyId: user.companyId,
          [field]: file.url,
        },
        data: { [field]: null },
      });
    }
    await logDesignActivity(
      user.companyId,
      user.id,
      "DESIGN",
      file.designRequestId,
      `Eliminó el archivo ${file.url}${file.tipoArchivo ? ` de tipo ${file.tipoArchivo}` : ""}`
    );
    revalidatePath(`/backlog/${file.designRequestId}`);
  }
  revalidatePath("/backlog");
  return { ok: true };
}

/**
 * Aprobación/rechazo de un archivo (ficha técnica). Deja constancia de quién
 * aprobó y cuándo; la firma manuscrita llegará con el flujo de e-firma.
 */
export async function setDesignFileEstado(
  id: string,
  estado: "APROBADA" | "RECHAZADA"
): Promise<ActionResult> {
  const user = await requirePermission("edit", "backlog_design");
  if (estado !== "APROBADA" && estado !== "RECHAZADA") {
    return { ok: false, error: "Estado inválido." };
  }
  const file = await db.attachment.findFirst({
    where: { id, companyId: user.companyId, entityType: "DESIGN", deletedAt: null },
    select: { id: true, url: true, tipoArchivo: true, designRequestId: true },
  });
  if (!file) return { ok: false, error: "No encontrado." };

  await db.attachment.update({
    where: { id: file.id },
    data: { estado, aprobadoPor: user.name, fechaAprobacion: new Date() },
  });
  if (file.designRequestId) {
    await logDesignActivity(
      user.companyId,
      user.id,
      "DESIGN",
      file.designRequestId,
      `${estado === "APROBADA" ? "Aprobó" : "Rechazó"} el archivo ${file.url}${file.tipoArchivo ? ` de tipo ${file.tipoArchivo}` : ""}`
    );

    // Si con esta validación quedan cubiertos los 3 entregables, deja
    // constancia (como el aviso del CRM original en Pendiente Validación).
    if (estado === "APROBADA") {
      const entregables = Object.keys(DELIVERABLE_BY_CATEGORY);
      const validados = await db.attachment.findMany({
        where: {
          designRequestId: file.designRequestId,
          entityType: "DESIGN",
          deletedAt: null,
          estado: "APROBADA",
          tipoArchivo: { in: entregables },
        },
        select: { tipoArchivo: true },
      });
      const cats = new Set(validados.map((v) => v.tipoArchivo));
      if (entregables.every((c) => cats.has(c))) {
        await logDesignActivity(
          user.companyId,
          user.id,
          "DESIGN",
          file.designRequestId,
          "Archivos [Despiece] [Armado general] [Planos Técnicos] validados completamente. El producto queda listo para la aprobación final."
        );
      }
    }
    revalidatePath(`/backlog/${file.designRequestId}`);
  }
  revalidatePath("/backlog");
  return { ok: true };
}

/**
 * Aprobación final (estado "Pendiente Validación"): cierra el ciclo de diseño
 * y pasa el producto a "Finalizados".
 */
export async function finalApproval(id: string): Promise<ActionResult> {
  const user = await requirePermission("edit", "backlog_design");
  const { count } = await db.designRequest.updateMany({
    where: { id, companyId: user.companyId, deletedAt: null },
    data: { estado: BACKLOG_ESTADO_FINAL },
  });
  if (!count) return { ok: false, error: "No encontrado." };
  await logDesignActivity(
    user.companyId,
    user.id,
    "DESIGN",
    id,
    "Realizó la aprobación final del producto"
  );
  revalidatePath("/backlog");
  revalidatePath(`/backlog/${id}`);
  return { ok: true };
}

export async function updateSpecial(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("edit", "special_designs");
  const parsed = specialSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { id, ...data } = parsed.data;
  try {
    const { count } = await db.specialDesign.updateMany({
      where: { id, companyId: user.companyId },
      data,
    });
    if (!count) return { ok: false, error: "No encontrado." };
  } catch {
    return { ok: false, error: "Ya existe un diseño con ese código." };
  }
  await logDesignActivity(user.companyId, user.id, "SPECIAL", id, "Ficha actualizada");
  revalidatePath(`/especiales/${id}`);
  return { ok: true };
}

export async function postSpecialMessage(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("view", "special_designs");
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { specialDesignId, body } = parsed.data;
  const found = await db.specialDesign.findFirst({
    where: { id: specialDesignId, companyId: user.companyId },
    select: { id: true },
  });
  if (!found) return { ok: false, error: "No encontrado." };

  await db.specialDesignMessage.create({
    data: { specialDesignId, userId: user.id, body },
  });
  revalidatePath(`/especiales/${specialDesignId}`);
  return { ok: true };
}

export async function saveSpecialFile(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("edit", "special_designs");
  const parsed = specialFileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { specialDesignId, tipoArchivo, observaciones, url } = parsed.data;
  const found = await db.specialDesign.findFirst({
    where: { id: specialDesignId, companyId: user.companyId },
    select: { id: true },
  });
  if (!found) return { ok: false, error: "No encontrado." };

  await db.attachment.create({
    data: {
      companyId: user.companyId,
      entityType: "SPECIAL",
      specialDesignId,
      tipoArchivo: tipoArchivo?.trim() || null,
      observaciones: observaciones?.trim() || null,
      bucket: "archivos",
      url,
    },
  });
  revalidatePath(`/especiales/${specialDesignId}`);
  return { ok: true };
}

export async function deleteSpecialFile(id: string): Promise<ActionResult> {
  const user = await requirePermission("edit", "special_designs");
  await db.attachment.deleteMany({
    where: { id, companyId: user.companyId, entityType: "SPECIAL" },
  });
  return { ok: true };
}
