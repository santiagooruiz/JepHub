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
  advisorId: nullableStr,
  estado: z.string().min(1),
  probabilidad: z.enum(["UNDEFINED", "HIGH", "FIXED"]),
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
    select: { id: true },
  });
  if (!client) return { ok: false, error: "Cliente no encontrado." };

  const fecha = fechaCierreProyectada ? new Date(fechaCierreProyectada) : null;
  const data = {
    ...rest,
    // Un Asesor siempre queda como dueño de sus oportunidades (no puede
    // asignarlas a otro); el admin sí elige el asesor.
    advisorId: isAsesor(user) ? user.id : rest.advisorId,
    clientId,
    fechaCierreProyectada:
      fecha && !Number.isNaN(fecha.getTime()) ? fecha : null,
  };

  if (id) {
    await db.opportunity.updateMany({
      where: { id, companyId: user.companyId, ...advisorScope(user) },
      data,
    });
  } else {
    const last = await db.opportunity.findFirst({
      where: { companyId: user.companyId },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    await db.opportunity.create({
      data: { ...data, companyId: user.companyId, numero: (last?.numero ?? 0) + 1 },
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
