"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import type { ActionResult } from "@/features/config/actions";

const nullableStr = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : null));

const clientSchema = z.object({
  id: z.string().optional(),
  personType: z.enum(["NATURAL", "JURIDICA"]),
  estado: z.string().min(1),
  nombres: nullableStr,
  apellidos: nullableStr,
  nombreComercial: nullableStr,
  razonSocial: nullableStr,
  email: nullableStr,
  telefono: nullableStr,
  tipoDocumento: nullableStr,
  numeroDocumento: nullableStr,
  direccion: nullableStr,
  complementoDireccion: nullableStr,
  pais: nullableStr,
  ciudad: nullableStr,
  observaciones: nullableStr,
  priceListId: nullableStr,
  sectorId: nullableStr,
  subSectorId: nullableStr,
  canal: nullableStr,
  advisorId: nullableStr,
});

export async function saveClient(input: unknown): Promise<ActionResult> {
  const raw = input as { id?: string };
  const user = await requirePermission(raw?.id ? "edit" : "create", "clients");

  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;

  if (d.personType === "NATURAL" && !d.nombres) {
    return { ok: false, error: "Los nombres son obligatorios para persona natural." };
  }
  if (d.personType === "JURIDICA" && !d.razonSocial) {
    return { ok: false, error: "La razón social es obligatoria para persona jurídica." };
  }

  const { id, ...data } = d;

  if (id) {
    await db.client.updateMany({
      where: { id, companyId: user.companyId },
      data,
    });
  } else {
    const last = await db.client.findFirst({
      where: { companyId: user.companyId },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    await db.client.create({
      data: {
        ...data,
        companyId: user.companyId,
        numero: (last?.numero ?? 0) + 1,
      },
    });
  }

  revalidatePath("/clientes");
  return { ok: true };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  const user = await requirePermission("delete", "clients");
  await db.client.updateMany({
    where: { id, companyId: user.companyId },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/clientes");
  return { ok: true };
}
