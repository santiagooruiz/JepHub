"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";

export type ActionResult = { ok: true } | { ok: false; error: string };

// ─────────────────────────── Categorías ───────────────────────────
const categorySchema = z.object({
  id: z.string().optional(),
  entity: z.string().min(1, "Entidad requerida"),
  name: z.string().min(1, "Nombre requerido"),
});

export async function saveCategory(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("manage", "categories");
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { id, entity, name } = parsed.data;
  try {
    if (id) {
      await db.category.updateMany({
        where: { id, companyId: user.companyId },
        data: { entity, name },
      });
    } else {
      await db.category.create({
        data: { companyId: user.companyId, entity, name },
      });
    }
  } catch {
    return { ok: false, error: "Ya existe una categoría con ese nombre en la entidad." };
  }
  revalidatePath("/configuracion/categorias");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const user = await requirePermission("manage", "categories");
  await db.category.deleteMany({ where: { id, companyId: user.companyId } });
  revalidatePath("/configuracion/categorias");
  return { ok: true };
}

// ─────────────────────────── Tags ───────────────────────────
const tagSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nombre requerido"),
});

export async function saveTag(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("manage", "tags");
  const parsed = tagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { id, name } = parsed.data;
  try {
    if (id) {
      await db.tag.updateMany({
        where: { id, companyId: user.companyId },
        data: { name },
      });
    } else {
      await db.tag.create({ data: { companyId: user.companyId, name } });
    }
  } catch {
    return { ok: false, error: "Ya existe un tag con ese nombre." };
  }
  revalidatePath("/configuracion/tags");
  return { ok: true };
}

export async function deleteTag(id: string): Promise<ActionResult> {
  const user = await requirePermission("manage", "tags");
  await db.tag.deleteMany({ where: { id, companyId: user.companyId } });
  revalidatePath("/configuracion/tags");
  return { ok: true };
}

// ─────────────────────────── Parámetros ───────────────────────────
const parameterSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1, "Clave requerida"),
  value: z.string().min(1, "Valor requerido"), // JSON como texto
});

export async function saveParameter(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("manage", "parameters");
  const parsed = parameterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { id, key, value } = parsed.data;

  let json: unknown;
  try {
    json = JSON.parse(value);
  } catch {
    return { ok: false, error: "El valor no es un JSON válido." };
  }

  try {
    if (id) {
      await db.parameter.updateMany({
        where: { id, companyId: user.companyId },
        data: { key, value: json as object },
      });
    } else {
      await db.parameter.create({
        data: { companyId: user.companyId, key, value: json as object },
      });
    }
  } catch {
    return { ok: false, error: "Ya existe un parámetro con esa clave." };
  }
  revalidatePath("/configuracion/parametros");
  return { ok: true };
}

export async function deleteParameter(id: string): Promise<ActionResult> {
  const user = await requirePermission("manage", "parameters");
  await db.parameter.deleteMany({ where: { id, companyId: user.companyId } });
  revalidatePath("/configuracion/parametros");
  return { ok: true };
}
