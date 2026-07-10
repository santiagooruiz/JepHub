"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requirePermission, requireUser } from "@/lib/guard";
import { isAdmin, isAsesor } from "@/lib/auth";
import { isErpDbConfigured } from "@/server/ofimatica/db";
import {
  ERP_CLIENT_SORT_KEYS,
  getErpClientByNit,
  getErpClientsExport,
  insertErpClient,
  updateErpClientContacts,
  type ErpClientSortKey,
  type ErpClientTipoFiltro,
} from "@/server/ofimatica/clients";
import { ERP_MAX_CONTACTS, type ErpClientRow } from "@/features/clients/types";
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
  codprecio: nullableStr,
  sectorId: nullableStr,
  subSectorId: nullableStr,
  canal: nullableStr,
  codven: nullableStr,
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

  // Asesor, lista de precio y canal solo los controla el administrador.
  const admin = isAdmin(user);
  const { id, codven, codprecio, canal, ...base } = d;

  if (id) {
    // Editar. Un no-admin no puede tocar asesor/lista de precio/canal: se omiten
    // del update para preservar los valores existentes.
    const restricted = admin ? { codven, codprecio, canal } : {};
    await db.client.updateMany({
      where: { id, companyId: user.companyId },
      data: { ...base, ...restricted },
    });
  } else {
    // El NIT es la llave con el ERP (PK de MTPROCLI): obligatorio al registrar.
    if (!d.numeroDocumento) {
      return {
        ok: false,
        error: "El número de documento (NIT) es obligatorio para registrar el cliente.",
      };
    }

    // Defaults por rol: el asesor hereda su propio CODVEN y la lista PUBLICO ('2').
    // Un asesor con varias sedes elige uno de SUS codvens; si no, se usa el primero.
    let effCodven: string | null;
    if (admin) {
      effCodven = codven;
    } else if (codven && user.codvens.includes(codven)) {
      effCodven = codven;
    } else {
      effCodven = user.codvens[0] ?? null;
    }
    const effCodprecio = admin ? codprecio : "2";
    const effCanal = admin ? canal : null;

    const nombre =
      d.personType === "JURIDICA"
        ? d.razonSocial || d.nombreComercial || ""
        : [d.nombres, d.apellidos].filter(Boolean).join(" ");

    // Se crea también en el ERP (MTPROCLI, HABILITADO='0'). Si falla, se aborta
    // antes de crear en PostgreSQL para no dejar las 2 bases desincronizadas.
    if (isErpDbConfigured()) {
      try {
        await insertErpClient({
          nit: d.numeroDocumento,
          nombre,
          esEmpresa: d.personType === "JURIDICA",
          nombres: d.nombres,
          apellidos: d.apellidos,
          email: d.email,
          telefono: d.telefono,
          direccion: d.direccion,
          esProspecto: d.estado === "Prospecto",
          codven: effCodven,
          codprecio: effCodprecio,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        return { ok: false, error: `No se pudo crear en el ERP: ${message}` };
      }
    }

    const last = await db.client.findFirst({
      where: { companyId: user.companyId },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    await db.client.create({
      data: {
        ...base,
        codven: effCodven,
        codprecio: effCodprecio,
        canal: effCanal,
        companyId: user.companyId,
        numero: (last?.numero ?? 0) + 1,
      },
    });
  }

  revalidatePath("/clientes");
  return { ok: true };
}

const anchorSchema = z.object({
  nit: z.string().min(1),
  nombre: z.string().min(1),
  esEmpresa: z.boolean().optional(),
});

/**
 * "Ancla" del cliente en PostgreSQL: registro mínimo (NIT + nombre) que permite
 * colgar oportunidades/actividades/archivos de un cliente que vive en el ERP.
 * Relaciona las 2 bases por `numeroDocumento = NIT`. Find-or-create.
 */
export async function ensureClientAnchor(
  input: unknown
): Promise<ActionResult & { clientId?: string }> {
  const user = await requireUser();
  const parsed = anchorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos del cliente inválidos." };
  const nit = parsed.data.nit.trim();
  const nombre = parsed.data.nombre.trim();

  const existing = await db.client.findFirst({
    where: { companyId: user.companyId, numeroDocumento: nit },
    select: { id: true },
  });
  if (existing) return { ok: true, clientId: existing.id };

  const last = await db.client.findFirst({
    where: { companyId: user.companyId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const esEmpresa = parsed.data.esEmpresa ?? true;
  const created = await db.client.create({
    data: {
      companyId: user.companyId,
      numero: (last?.numero ?? 0) + 1,
      numeroDocumento: nit,
      tipoDocumento: "NIT",
      personType: esEmpresa ? "JURIDICA" : "NATURAL",
      ...(esEmpresa ? { razonSocial: nombre } : { nombres: nombre }),
      estado: "Cliente",
    },
    select: { id: true },
  });
  return { ok: true, clientId: created.id };
}

/**
 * Filas para exportar el listado de clientes a Excel (todas las páginas del
 * set filtrado). El alcance por asesor se deriva de la sesión en el servidor.
 */
export async function exportErpClients(input: {
  q?: string;
  tipo?: string;
  ciudad?: string;
  asesor?: string;
  sort?: string;
  dir?: string;
}): Promise<ActionResult & { rows?: ErpClientRow[] }> {
  const user = await requireUser();
  if (!user.ability.can("view", "clients")) {
    return { ok: false, error: "Sin permiso para ver clientes." };
  }
  try {
    const rows = await getErpClientsExport({
      q: input.q,
      tipo: ["empresas", "personas", "prospectos"].includes(input.tipo ?? "")
        ? (input.tipo as ErpClientTipoFiltro)
        : undefined,
      ciudad: input.ciudad,
      // El filtro por asesor específico es del admin; el rol Asesor ya viene
      // limitado por su alcance (codvens).
      vendedor: isAsesor(user) ? undefined : input.asesor,
      sort: ERP_CLIENT_SORT_KEYS.includes(input.sort as ErpClientSortKey)
        ? (input.sort as ErpClientSortKey)
        : undefined,
      dir: input.dir === "desc" ? "desc" : "asc",
      codvens: isAsesor(user) ? user.codvens : undefined,
    });
    return { ok: true, rows };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: `No se pudo exportar: ${message}` };
  }
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

// ────────────────── Contactos del ERP (MTPROCLI ZCONTAC1..4) ──────────────────
// Los contactos de un cliente del ERP viven en 4 slots de columnas planas de
// MTPROCLI. La estrategia es leer-modificar-reescribir compactado: la acción lee
// los contactos actuales, aplica la operación (agregar/editar/eliminar) y
// reescribe los 4 slots, así nunca quedan huecos intermedios.

const erpContactSchema = z.object({
  nit: z.string().min(1),
  /** Índice (0..3) dentro de la lista compactada; ausente = agregar nuevo. */
  index: z.number().int().min(0).max(3).optional(),
  nombre: z.string().trim().min(1, "Nombre requerido").max(60, "Nombre: máximo 60 caracteres"),
  cargo: z.string().trim().max(60, "Cargo: máximo 60 caracteres").optional().default(""),
  email: z.string().trim().max(160, "Correo: máximo 160 caracteres").optional().default(""),
  telefono: z.string().trim().max(30, "Teléfono: máximo 30 caracteres").optional().default(""),
});

/** Carga el cliente del ERP validando el alcance por asesor. */
async function getScopedErpClient(
  user: Awaited<ReturnType<typeof requireUser>>,
  nit: string
) {
  const erp = await getErpClientByNit(nit);
  if (!erp) return null;
  if (isAsesor(user) && !user.codvens.includes(erp.codven)) return null;
  return erp;
}

export async function saveErpContact(input: unknown): Promise<ActionResult> {
  const raw = input as { index?: number };
  const user = await requirePermission(
    raw?.index !== undefined ? "editcontact" : "createcontact",
    "clients"
  );
  const parsed = erpContactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { nit, index, ...contact } = parsed.data;

  try {
    const erp = await getScopedErpClient(user, nit);
    if (!erp) return { ok: false, error: "Cliente no encontrado." };

    const contacts = [...erp.contacts];
    if (index === undefined) {
      if (contacts.length >= ERP_MAX_CONTACTS) {
        return { ok: false, error: `El cliente ya tiene los ${ERP_MAX_CONTACTS} contactos permitidos.` };
      }
      contacts.push(contact);
    } else {
      if (index >= contacts.length) return { ok: false, error: "Contacto no encontrado." };
      contacts[index] = contact;
    }
    await updateErpClientContacts(nit, contacts);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: `No se pudo guardar en el ERP: ${message}` };
  }

  revalidatePath(`/clientes/${nit}`);
  return { ok: true };
}

export async function deleteErpContact(input: {
  nit: string;
  index: number;
}): Promise<ActionResult> {
  const user = await requirePermission("deletecontact", "clients");
  const nit = (input?.nit ?? "").trim();
  const index = Number(input?.index);
  if (!nit || !Number.isInteger(index) || index < 0 || index > 3) {
    return { ok: false, error: "Datos inválidos" };
  }

  try {
    const erp = await getScopedErpClient(user, nit);
    if (!erp) return { ok: false, error: "Cliente no encontrado." };
    if (index >= erp.contacts.length) return { ok: false, error: "Contacto no encontrado." };

    const contacts = erp.contacts.filter((_, i) => i !== index);
    await updateErpClientContacts(nit, contacts);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: `No se pudo eliminar en el ERP: ${message}` };
  }

  revalidatePath(`/clientes/${nit}`);
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
