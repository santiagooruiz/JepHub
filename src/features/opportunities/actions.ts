"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { isAsesor } from "@/lib/auth";
import { advisorScope } from "@/lib/scope";
import type { ActionResult } from "@/features/config/actions";
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
    select: { id: true, advisorId: true },
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
    await db.opportunity.updateMany({
      where: { id, companyId: user.companyId, ...advisorScope(user) },
      // Al editar solo se re-sincroniza el asesor si el cliente tiene uno
      // asignado (no se pisa con null un dueño ya existente).
      data: { ...data, ...(client.advisorId ? { advisorId: client.advisorId } : {}) },
    });
  } else {
    const last = await db.opportunity.findFirst({
      where: { companyId: user.companyId },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    await db.opportunity.create({
      data: {
        ...data,
        advisorId,
        companyId: user.companyId,
        numero: (last?.numero ?? 0) + 1,
      },
    });
  }

  revalidatePath("/oportunidades");
  return { ok: true };
}

export async function deleteOpportunity(id: string): Promise<ActionResult> {
  const user = await requirePermission("delete", "opportunities");
  await db.opportunity.updateMany({
    where: { id, companyId: user.companyId, ...advisorScope(user) },
    data: { deletedAt: new Date() },
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
  await db.opportunity.updateMany({
    where: { id, companyId: user.companyId, ...advisorScope(user) },
    data: { estado },
  });
  revalidatePath("/oportunidades");
  return { ok: true };
}
