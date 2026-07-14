"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import type { ActionResult } from "@/features/config/actions";

/** Interno: genera (o reutiliza) el link de firma para el cliente. */
export async function createSignatureLink(
  quoteId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const user = await requirePermission("sign", "quotes");
  const quote = await db.quote.findFirst({
    where: { id: quoteId, companyId: user.companyId },
    select: { id: true, signature: { select: { token: true } } },
  });
  if (!quote) return { ok: false, error: "Cotización no encontrada." };

  let token = quote.signature?.token;
  if (!token) {
    token = randomBytes(24).toString("hex");
    await db.signature.create({ data: { quoteId, token } });
  }

  const base = process.env.APP_URL || "http://localhost:3000";
  revalidatePath(`/cotizaciones/${quoteId}`);
  return { ok: true, url: `${base}/firma/${token}` };
}

// La firma llega como data-URL PNG/JPEG generada en el navegador (canvas).
const FIRMA_DATA_URL = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/;
const FIRMA_MAX_CHARS = 2_000_000; // ~1.5 MB de binario

/** Público (sin sesión): el cliente aprueba y firma. */
export async function signQuote(
  token: string,
  nombre: string,
  email: string,
  firmaImagen: string
): Promise<ActionResult> {
  if (!token || !nombre.trim()) {
    return { ok: false, error: "Ingresa tu nombre para firmar." };
  }
  if (!firmaImagen) {
    return { ok: false, error: "Dibuja o adjunta tu firma para continuar." };
  }
  if (firmaImagen.length > FIRMA_MAX_CHARS || !FIRMA_DATA_URL.test(firmaImagen)) {
    return { ok: false, error: "La firma no es válida. Intenta de nuevo." };
  }
  const sig = await db.signature.findUnique({
    where: { token },
    select: { quoteId: true, estado: true },
  });
  if (!sig) return { ok: false, error: "Enlace inválido." };
  if (sig.estado === "firmada") {
    return { ok: false, error: "Esta cotización ya fue firmada." };
  }

  await db.$transaction([
    db.signature.update({
      where: { token },
      data: {
        estado: "firmada",
        firmanteNombre: nombre.trim(),
        firmanteEmail: email.trim() || null,
        firmaImagen,
        firmadaEn: new Date(),
      },
    }),
    db.quote.update({ where: { id: sig.quoteId }, data: { estado: "Aprobada" } }),
  ]);

  revalidatePath(`/firma/${token}`);
  return { ok: true };
}

/** Público (sin sesión): el cliente rechaza. */
export async function rejectQuote(token: string): Promise<ActionResult> {
  const sig = await db.signature.findUnique({
    where: { token },
    select: { quoteId: true, estado: true },
  });
  if (!sig) return { ok: false, error: "Enlace inválido." };
  if (sig.estado === "firmada") {
    return { ok: false, error: "Esta cotización ya fue firmada." };
  }

  await db.$transaction([
    db.signature.update({ where: { token }, data: { estado: "rechazada" } }),
    db.quote.update({
      where: { id: sig.quoteId },
      data: { estado: "No aprobada" },
    }),
  ]);

  revalidatePath(`/firma/${token}`);
  return { ok: true };
}
