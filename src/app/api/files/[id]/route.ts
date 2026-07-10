import { Readable } from "node:stream";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFileStream } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Descarga de un adjunto: verifica sesión + tenant y sirve el binario desde
 * MinIO (los archivos nunca se exponen públicos). Para adjuntos antiguos que
 * son solo una URL registrada, redirige a esa URL.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const att = await db.attachment.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    select: { storageKey: true, url: true, nombre: true, mimeType: true },
  });
  if (!att) {
    return NextResponse.json({ error: "Adjunto no encontrado." }, { status: 404 });
  }

  if (!att.storageKey) {
    // Adjunto registrado como URL externa (sin binario propio).
    if (/^https?:\/\//i.test(att.url)) return NextResponse.redirect(att.url);
    return NextResponse.json(
      { error: "Este adjunto no tiene archivo almacenado." },
      { status: 404 }
    );
  }

  try {
    const { stream, contentType, contentLength } = await getFileStream(att.storageKey);
    const headers = new Headers();
    headers.set("Content-Type", att.mimeType || contentType || "application/octet-stream");
    if (contentLength) headers.set("Content-Length", String(contentLength));
    const filename = encodeURIComponent(att.nombre || "archivo");
    headers.set("Content-Disposition", `inline; filename*=UTF-8''${filename}`);
    headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    return new Response(Readable.toWeb(stream) as ReadableStream, { headers });
  } catch (err) {
    console.error(`Error leyendo el adjunto ${id} del storage:`, err);
    return NextResponse.json(
      { error: "No se pudo leer el archivo del almacenamiento." },
      { status: 502 }
    );
  }
}
