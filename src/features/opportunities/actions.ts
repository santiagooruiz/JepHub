"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { isAsesor } from "@/lib/auth";
import { advisorScope } from "@/lib/scope";
import type { ActionResult } from "@/features/config/actions";
import { logAutoActivity } from "@/features/activity/log";
import { clientDisplayName } from "@/features/clients/queries";
import { OPP_ESTADOS } from "./types";

const nullableStr = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : null));

const schema = z.object({
  id: z.string().optional(),
  clientId: z.string().min(1, "Cliente requerido"),
  nombre: z.string().min(1, "Nombre requerido"),
  contacto: nullableStr,
  cantidadPuestos: z.number().int().min(0).nullable().optional(),
  areaCubrir: z.number().min(0).nullable().optional(),
  observaciones: nullableStr,
  fechaCierreProyectada: nullableStr,
});

export async function saveOpportunity(input: unknown): Promise<ActionResult> {
  const raw = input as { id?: string };
  const user = await requirePermission(
    raw?.id ? "edit" : "create",
    "opportunities"
  );

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { id, clientId, fechaCierreProyectada, ...rest } = parsed.data;

  const client = await db.client.findFirst({
    where: { id: clientId, companyId: user.companyId },
    select: {
      id: true,
      advisorId: true,
      personType: true,
      nombres: true,
      apellidos: true,
      razonSocial: true,
      nombreComercial: true,
    },
  });
  if (!client) return { ok: false, error: "Cliente no encontrado." };

  // El asesor no se elige en el formulario: la oportunidad hereda el asesor
  // asignado del cliente; si el cliente no tiene y quien crea es un Asesor,
  // queda a su nombre. El estado tampoco: arranca "No Cotizada" (default del
  // modelo) y pasa a "Cotizada" cuando se crea una cotización.
  const advisorId = client.advisorId ?? (isAsesor(user) ? user.id : null);

  const fecha = fechaCierreProyectada ? new Date(fechaCierreProyectada) : null;
  const data = {
    ...rest,
    clientId,
    fechaCierreProyectada:
      fecha && !Number.isNaN(fecha.getTime()) ? fecha : null,
  };

  if (id) {
    const { count } = await db.opportunity.updateMany({
      where: { id, companyId: user.companyId, ...advisorScope(user) },
      // Al editar solo se re-sincroniza el asesor si el cliente tiene uno
      // asignado (no se pisa con null un dueño ya existente).
      data: { ...data, ...(client.advisorId ? { advisorId: client.advisorId } : {}) },
    });
    if (count) {
      await logAutoActivity({
        companyId: user.companyId,
        userId: user.id,
        entityType: "OPPORTUNITY",
        accion: `Actualizó la oportunidad ${data.nombre}`,
        clientId,
        opportunityId: id,
      });
    }
  } else {
    const last = await db.opportunity.findFirst({
      where: { companyId: user.companyId },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    const created = await db.opportunity.create({
      data: {
        ...data,
        advisorId,
        companyId: user.companyId,
        numero: (last?.numero ?? 0) + 1,
      },
    });
    await logAutoActivity({
      companyId: user.companyId,
      userId: user.id,
      entityType: "OPPORTUNITY",
      accion: `Registró la oportunidad ${created.nombre} al cliente ${clientDisplayName(client)}`,
      clientId,
      opportunityId: created.id,
    });
  }

  revalidatePath("/oportunidades");
  return { ok: true };
}

export async function deleteOpportunity(id: string): Promise<ActionResult> {
  const user = await requirePermission("delete", "opportunities");
  const opp = await db.opportunity.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null, ...advisorScope(user) },
    select: { id: true, nombre: true, numero: true, clientId: true },
  });
  if (!opp) return { ok: false, error: "Oportunidad no encontrada." };

  await db.opportunity.update({
    where: { id: opp.id },
    data: { deletedAt: new Date() },
  });
  await logAutoActivity({
    companyId: user.companyId,
    userId: user.id,
    entityType: "OPPORTUNITY",
    accion: `Eliminó la oportunidad N° ${opp.numero} ${opp.nombre}`,
    clientId: opp.clientId,
    opportunityId: opp.id,
  });
  revalidatePath("/oportunidades");
  return { ok: true };
}

/** Mueve una oportunidad de estado (usado por el Kanban). */
export async function updateOpportunityStage(
  id: string,
  estado: string
): Promise<ActionResult> {
  const user = await requirePermission("edit", "opportunities");
  if (!OPP_ESTADOS.includes(estado)) {
    return { ok: false, error: "Estado inválido." };
  }
  const opp = await db.opportunity.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null, ...advisorScope(user) },
    select: { id: true, nombre: true, clientId: true, estado: true },
  });
  if (!opp) return { ok: false, error: "Oportunidad no encontrada." };

  await db.opportunity.update({ where: { id: opp.id }, data: { estado } });
  if (estado !== opp.estado) {
    await logAutoActivity({
      companyId: user.companyId,
      userId: user.id,
      entityType: "OPPORTUNITY",
      accion: `Cambió el estado de la oportunidad ${opp.nombre} a ${estado}`,
      clientId: opp.clientId,
      opportunityId: opp.id,
    });
  }
  revalidatePath("/oportunidades");
  return { ok: true };
}
