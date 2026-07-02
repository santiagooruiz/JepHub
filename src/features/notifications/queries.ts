import { db } from "@/lib/db";

export type NotificationItem = {
  id: string;
  titulo: string;
  cuerpo: string | null;
  href: string | null;
  leida: boolean;
  createdAt: string;
};

/** Notificaciones del usuario (propias + difusión del tenant) + no leídas. */
export async function getNotifications(user: { id: string; companyId: string }) {
  const where = {
    companyId: user.companyId,
    OR: [{ userId: user.id }, { userId: null }],
  };
  const [items, unread] = await Promise.all([
    db.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 15 }),
    db.notification.count({ where: { ...where, leida: false } }),
  ]);

  return {
    unread,
    items: items.map((n): NotificationItem => ({
      id: n.id,
      titulo: n.titulo,
      cuerpo: n.cuerpo,
      href: n.href,
      leida: n.leida,
      createdAt: n.createdAt.toLocaleString("es-CO"),
    })),
  };
}
