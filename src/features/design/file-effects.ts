import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { DELIVERABLE_BY_CATEGORY } from "./types";

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

  revalidatePath("/backlog");
  revalidatePath(`/backlog/${designRequestId}`);
}
