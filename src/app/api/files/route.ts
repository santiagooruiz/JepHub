import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isAllowedFile,
  isStorageConfigured,
  MAX_FILE_SIZE,
  putFile,
  sanitizeFileName,
} from "@/lib/storage";
import { applyDesignFileEffects } from "@/features/design/file-effects";
import { DESIGN_FILE_CATEGORIES } from "@/features/design/types";

export const runtime = "nodejs";

/**
 * Subida binaria de adjuntos (multipart/form-data).
 * Campos: `file` + exactamente uno de `clientId` | `opportunityId` |
 * `designRequestId` | `specialDesignId`, opcionales `tipoArchivo` y
 * `observaciones`. Guarda el binario en MinIO y crea el registro `Attachment`.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "El almacenamiento de archivos no está configurado." },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formulario inválido." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `El archivo supera el máximo de ${MAX_FILE_SIZE / 1024 / 1024} MB.` },
      { status: 400 }
    );
  }
  if (!isAllowedFile(file.name)) {
    return NextResponse.json(
      { error: "Tipo de archivo no permitido." },
      { status: 400 }
    );
  }

  const clientId = (form.get("clientId") as string | null) || null;
  const opportunityId = (form.get("opportunityId") as string | null) || null;
  const designRequestId = (form.get("designRequestId") as string | null) || null;
  const specialDesignId = (form.get("specialDesignId") as string | null) || null;
  const tipoArchivo = (form.get("tipoArchivo") as string | null)?.trim() || null;
  const observaciones = (form.get("observaciones") as string | null)?.trim() || null;

  // Exactamente una entidad ancla, del tenant del usuario.
  const refs = [clientId, opportunityId, designRequestId, specialDesignId].filter(Boolean);
  if (refs.length !== 1) {
    return NextResponse.json({ error: "Entidad requerida." }, { status: 400 });
  }

  let entityType: "CLIENT" | "OPPORTUNITY" | "DESIGN" | "SPECIAL";
  if (clientId) {
    entityType = "CLIENT";
    const client = await db.client.findFirst({
      where: { id: clientId, companyId: user.companyId },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }
  } else if (opportunityId) {
    entityType = "OPPORTUNITY";
    const opp = await db.opportunity.findFirst({
      where: { id: opportunityId, companyId: user.companyId },
      select: { id: true },
    });
    if (!opp) {
      return NextResponse.json({ error: "Oportunidad no encontrada." }, { status: 404 });
    }
  } else if (designRequestId) {
    entityType = "DESIGN";
    if (!user.ability.can("edit", "backlog_design")) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    if (tipoArchivo && !(DESIGN_FILE_CATEGORIES as readonly string[]).includes(tipoArchivo)) {
      return NextResponse.json({ error: "Categoría de archivo inválida." }, { status: 400 });
    }
    const dr = await db.designRequest.findFirst({
      where: { id: designRequestId, companyId: user.companyId, deletedAt: null },
      select: { id: true },
    });
    if (!dr) {
      return NextResponse.json({ error: "Solicitud de diseño no encontrada." }, { status: 404 });
    }
  } else {
    entityType = "SPECIAL";
    if (!user.ability.can("edit", "special_designs")) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const special = await db.specialDesign.findFirst({
      where: { id: specialDesignId as string, companyId: user.companyId },
      select: { id: true },
    });
    if (!special) {
      return NextResponse.json({ error: "Diseño especial no encontrado." }, { status: 404 });
    }
  }

  const id = randomUUID();
  const storageKey = `${user.companyId}/${entityType.toLowerCase()}/${id}/${sanitizeFileName(file.name)}`;

  try {
    await putFile(
      storageKey,
      Buffer.from(await file.arrayBuffer()),
      file.type || "application/octet-stream"
    );
  } catch (err) {
    console.error("Error subiendo archivo al storage:", err);
    return NextResponse.json(
      { error: "No se pudo guardar el archivo en el almacenamiento." },
      { status: 502 }
    );
  }

  const attachment = await db.attachment.create({
    data: {
      id,
      companyId: user.companyId,
      entityType,
      clientId,
      opportunityId,
      designRequestId,
      specialDesignId,
      tipoArchivo,
      observaciones,
      url: `/api/files/${id}`,
      storageKey,
      nombre: file.name,
      mimeType: file.type || null,
      size: file.size,
    },
    select: { id: true, url: true },
  });

  // Mismos efectos (histórico, marcar entregable, notificar al solicitante)
  // que el registro manual de URL en el Backlog Diseño.
  if (entityType === "DESIGN" && designRequestId && tipoArchivo) {
    await applyDesignFileEffects(
      user.companyId,
      user.id,
      user.name,
      designRequestId,
      tipoArchivo,
      attachment.url
    );
  }

  return NextResponse.json({ ok: true, attachment });
}
