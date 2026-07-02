"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import type { ActionResult } from "@/features/config/actions";
import { BACKLOG_ESTADOS, BACKLOG_ESTADO_FINAL } from "./types";
import {
  designPlanningSchema,
  entregablesSchema,
  specialSchema,
  messageSchema,
  specialFileSchema,
} from "./schema";

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

/** "Solicitar planos/cambios": envía una cotización a la cola de diseño. */
export async function requestDesign(
  quoteId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requirePermission("create", "backlog_design");

  const quote = await db.quote.findFirst({
    where: { id: quoteId, companyId: user.companyId, deletedAt: null },
    include: {
      items: { take: 1, orderBy: { id: "asc" } },
      designRequests: { where: { deletedAt: null }, select: { id: true }, take: 1 },
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
      imagen: first?.imagen ?? null,
      descripcion: first?.descripcion ?? null,
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
  ]);

  revalidatePath("/backlog");
  revalidatePath(`/cotizaciones/${quoteId}`);
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
