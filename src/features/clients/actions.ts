"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requirePermission, requireUser } from "@/lib/guard";
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

// ─────────────────────────── Contactos internos ───────────────────────────
const contactSchema = z.object({
  id: z.string().optional(),
  clientId: z.string().min(1),
  nombre: z.string().min(1, "Nombre requerido"),
  email: nullableStr,
  telefono: nullableStr,
  cargo: nullableStr,
  observacion: nullableStr,
});

export async function saveContact(input: unknown): Promise<ActionResult> {
  const raw = input as { id?: string };
  const user = await requirePermission(
    raw?.id ? "editcontact" : "createcontact",
    "clients"
  );
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { id, clientId, ...data } = parsed.data;

  const client = await db.client.findFirst({
    where: { id: clientId, companyId: user.companyId },
    select: { id: true },
  });
  if (!client) return { ok: false, error: "Cliente no encontrado." };

  if (id) {
    await db.contact.updateMany({
      where: { id, client: { companyId: user.companyId } },
      data,
    });
  } else {
    await db.contact.create({ data: { clientId, ...data } });
  }
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

export async function deleteContact(id: string): Promise<ActionResult> {
  const user = await requirePermission("deletecontact", "clients");
  const contact = await db.contact.findFirst({
    where: { id, client: { companyId: user.companyId } },
    select: { clientId: true },
  });
  if (!contact) return { ok: false, error: "Contacto no encontrado." };
  await db.contact.delete({ where: { id } });
  revalidatePath(`/clientes/${contact.clientId}`);
  return { ok: true };
}

// ─────────────────────────── Adjuntos ───────────────────────────
// Adjuntos de cliente u oportunidad (exactamente uno de los dos ids).
const attachmentSchema = z
  .object({
    clientId: z.string().optional(),
    opportunityId: z.string().optional(),
    tipoArchivo: nullableStr,
    observaciones: nullableStr,
    url: z.string().min(1, "URL o nombre requerido"),
  })
  .refine((d) => Boolean(d.clientId) !== Boolean(d.opportunityId), {
    message: "Entidad requerida",
  });

export async function saveAttachment(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = attachmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { clientId, opportunityId, tipoArchivo, observaciones, url } = parsed.data;

  if (clientId) {
    const client = await db.client.findFirst({
      where: { id: clientId, companyId: user.companyId },
      select: { id: true },
    });
    if (!client) return { ok: false, error: "Cliente no encontrado." };
  } else {
    const opp = await db.opportunity.findFirst({
      where: { id: opportunityId, companyId: user.companyId },
      select: { id: true },
    });
    if (!opp) return { ok: false, error: "Oportunidad no encontrada." };
  }

  await db.attachment.create({
    data: {
      companyId: user.companyId,
      entityType: clientId ? "CLIENT" : "OPPORTUNITY",
      clientId: clientId ?? null,
      opportunityId: opportunityId ?? null,
      tipoArchivo,
      observaciones,
      url,
    },
  });
  revalidatePath(clientId ? `/clientes/${clientId}` : `/oportunidades/${opportunityId}`);
  return { ok: true };
}

export async function deleteAttachment(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const att = await db.attachment.findFirst({
    where: { id, companyId: user.companyId },
    select: { clientId: true, opportunityId: true },
  });
  if (!att) return { ok: false, error: "Adjunto no encontrado." };
  await db.attachment.delete({ where: { id } });
  if (att.clientId) revalidatePath(`/clientes/${att.clientId}`);
  if (att.opportunityId) revalidatePath(`/oportunidades/${att.opportunityId}`);
  return { ok: true };
}
