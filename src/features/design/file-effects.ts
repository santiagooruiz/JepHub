import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { BACKLOG_ESTADO_FINAL, DELIVERABLE_BY_CATEGORY } from "./types";

/**
 * Efectos de negocio al registrar un archivo de una solicitud de diseño:
 * histórico, marcar el entregable (Despiece/Armado/Planos) y notificar al
 * solicitante. Compartido entre el registro manual de URL (`saveDesignFile`)
 * y la subida binaria (`/api/files`) para no duplicar la lógica.
 */
export async function applyDesignFileEffects(
  companyId: string,
  userId: string,
  userName: string,
  designRequestId: string,
  tipoArchivo: string,
  url: string
): Promise<void> {
  const dr = await db.designRequest.findFirst({
    where: { id: designRequestId, companyId },
    select: {
      numero: true,
      descripcion: true,
      requestedById: true,
      despiece: true,
      armadoGeneral: true,
      planosTecnicos: true,
      quoteId: true,
      estado: true,
    },
  });
  if (!dr) return;

  await db.activity.create({
    data: {
      companyId,
      entityType: "DESIGN",
      designRequestId,
      accion: `Subió el archivo ${url} de tipo ${tipoArchivo}`,
      fechaHora: new Date(),
      observaciones: null,
      userId,
      auto: true,
    },
  });

  const field = DELIVERABLE_BY_CATEGORY[tipoArchivo as keyof typeof DELIVERABLE_BY_CATEGORY];
  if (field && !dr[field]) {
    await db.designRequest.update({
      where: { id: designRequestId },
      data: { [field]: url },
    });
    if (dr.requestedById && dr.requestedById !== userId) {
      await db.notification.create({
        data: {
          companyId,
          userId: dr.requestedById,
          tipo: "diseño",
          titulo: `Diseño N°${dr.numero}: entregables disponibles`,
          cuerpo: `${userName} subió ${tipoArchivo}${dr.descripcion ? ` · ${dr.descripcion}` : ""}.`,
          href: `/backlog/${designRequestId}`,
        },
      });
    }
  }

  // Cierre automático: Planos Comerciales es el entregable de "Solicitar
  // planos/cambios" (origen cotización); al subirlo, la solicitud se cierra
  // sin pasar por el pipeline ISO completo (ese sigue vigente para
  // Despiece/Armado/Planos Técnicos vía "Aprobación final").
  if (tipoArchivo === "Planos Comerciales" && dr.quoteId && dr.estado !== BACKLOG_ESTADO_FINAL) {
    await db.designRequest.update({
      where: { id: designRequestId },
      data: { estado: BACKLOG_ESTADO_FINAL },
    });
    await db.activity.create({
      data: {
        companyId,
        entityType: "DESIGN",
        designRequestId,
        accion: "Cerró la solicitud automáticamente al subir Planos Comerciales",
        fechaHora: new Date(),
        userId,
        auto: true,
      },
    });
    if (dr.requestedById && dr.requestedById !== userId) {
      await db.notification.create({
        data: {
          companyId,
          userId: dr.requestedById,
          tipo: "diseño",
          titulo: `Diseño N°${dr.numero}: Planos Comerciales listos`,
          cuerpo: `${userName} subió Planos Comerciales${dr.descripcion ? ` · ${dr.descripcion}` : ""}. La solicitud fue cerrada.`,
          href: `/backlog/${designRequestId}`,
        },
      });
    }
  }

  revalidatePath("/backlog");
  revalidatePath(`/backlog/${designRequestId}`);
}
