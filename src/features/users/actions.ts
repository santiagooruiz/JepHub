"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { hashPassword } from "@/lib/auth";
import type { ActionResult } from "@/features/config/actions";

const nullableStr = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : null));

const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nombre requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().optional().nullable(),
  roleId: z.string().min(1, "Perfil requerido"),
  cargoActual: nullableStr,
  // Uno o varios códigos de vendedor del ERP (un asesor puede manejar varias sedes).
  codvens: z.array(z.string().min(1)).optional().default([]),
  numeroTelefonico: nullableStr,
  status: z.enum(["ACTIVE", "INACTIVE", "PASSWORD_CHANGE"]).default("ACTIVE"),
});

/** Crea o edita un usuario. La contraseña es obligatoria al crear; al editar,
 *  si viene vacía se conserva la actual. Valida email único y cupo del rol. */
export async function saveUser(input: unknown): Promise<ActionResult> {
  const raw = input as { id?: string };
  const user = await requirePermission(raw?.id ? "edit" : "create", "users");

  const parsed = userSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;
  const email = d.email.trim().toLowerCase();
  // Normaliza los codvens (dedup) y el primario para compatibilidad.
  const codvens = [...new Set(d.codvens.map((c) => c.trim()).filter(Boolean))];
  const codven = codvens[0] ?? null;

  // El rol debe pertenecer a la empresa.
  const role = await db.role.findFirst({
    where: { id: d.roleId, companyId: user.companyId },
    select: { id: true, name: true, seatLimit: true },
  });
  if (!role) return { ok: false, error: "Perfil no encontrado." };

  // Email único (global).
  const emailOwner = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (emailOwner && emailOwner.id !== d.id) {
    return { ok: false, error: "Ya existe un usuario con ese email." };
  }

  if (d.id) {
    const updated = await db.user.updateMany({
      where: { id: d.id, companyId: user.companyId },
      data: {
        name: d.name.trim(),
        email,
        roleId: d.roleId,
        cargoActual: d.cargoActual,
        codven,
        codvens,
        numeroTelefonico: d.numeroTelefonico,
        status: d.status,
        ...(d.password && d.password.trim()
          ? { passwordHash: await hashPassword(d.password.trim()) }
          : {}),
      },
    });
    if (!updated.count) return { ok: false, error: "Usuario no encontrado." };
  } else {
    if (!d.password || d.password.trim().length < 6) {
      return { ok: false, error: "La contraseña es obligatoria (mínimo 6 caracteres)." };
    }
    // Cupo del rol (usuarios existentes con ese rol vs. límite).
    if (role.seatLimit != null) {
      const used = await db.user.count({ where: { companyId: user.companyId, roleId: role.id } });
      if (used >= role.seatLimit) {
        return { ok: false, error: `El perfil "${role.name}" alcanzó su cupo (${role.seatLimit}).` };
      }
    }
    await db.user.create({
      data: {
        companyId: user.companyId,
        name: d.name.trim(),
        email,
        passwordHash: await hashPassword(d.password.trim()),
        roleId: d.roleId,
        cargoActual: d.cargoActual,
        codven,
        codvens,
        numeroTelefonico: d.numeroTelefonico,
        status: d.status,
      },
    });
  }

  revalidatePath("/configuracion/usuarios");
  return { ok: true };
}

/** Activa o desactiva un usuario. Un usuario INACTIVO no puede iniciar
 *  sesión y su sesión vigente se corta en el siguiente request. */
export async function setUserStatus(
  userId: string,
  status: "ACTIVE" | "INACTIVE"
): Promise<ActionResult> {
  const user = await requirePermission("edit", "users");
  if (status !== "ACTIVE" && status !== "INACTIVE") {
    return { ok: false, error: "Estado inválido." };
  }
  if (userId === user.id) {
    return { ok: false, error: "No puedes desactivar tu propio usuario." };
  }

  const { count } = await db.user.updateMany({
    where: { id: userId, companyId: user.companyId },
    data: { status },
  });
  if (!count) return { ok: false, error: "Usuario no encontrado." };

  revalidatePath("/configuracion/usuarios");
  return { ok: true };
}
