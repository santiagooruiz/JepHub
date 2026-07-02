import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TabsLite } from "@/components/ui/tabs-lite";
import { Timeline } from "@/features/activity/timeline";
import { getSpecialDesign } from "@/features/design/queries";
import { specialEstadoVariant } from "@/features/design/types";
import { SpecialInfoForm } from "@/features/design/special-info-form";
import { MessagesPanel } from "@/features/design/messages-panel";
import { SpecialFilesPanel } from "@/features/design/special-files-panel";

export const dynamic = "force-dynamic";

const dateTime = (d: Date) => d.toLocaleString("es-CO");

export default async function EspecialDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("view", "special_designs");
  const canEdit = user.ability.can("edit", "special_designs");
  const { id } = await params;

  const s = await getSpecialDesign(user.companyId, id);
  if (!s) notFound();

  const [files, activities] = await Promise.all([
    db.attachment.findMany({
      where: { specialDesignId: s.id, companyId: user.companyId, entityType: "SPECIAL" },
      orderBy: { createdAt: "desc" },
    }),
    db.activity.findMany({
      where: { specialDesignId: s.id, companyId: user.companyId },
      include: { user: { select: { name: true } } },
      orderBy: { fechaHora: "desc" },
    }),
  ]);

  const tabs = [
    {
      id: "info",
      label: "Información",
      content: (
        <SpecialInfoForm
          canEdit={canEdit}
          values={{
            id: s.id,
            codigo: s.codigo,
            tipo: s.tipo ?? "",
            descripcion: s.descripcion ?? "",
            imagen: s.imagen ?? "",
            estado: s.estado,
            precioVentaPublico:
              s.precioVentaPublico != null ? String(s.precioVentaPublico) : "",
            precioVentaDto: s.precioVentaDto != null ? String(s.precioVentaDto) : "",
            cantRequerida: s.cantRequerida != null ? String(s.cantRequerida) : "",
          }}
        />
      ),
    },
    {
      id: "archivos",
      label: `Archivos (${files.length})`,
      content: (
        <SpecialFilesPanel
          specialDesignId={s.id}
          canEdit={canEdit}
          files={files.map((f) => ({
            id: f.id,
            tipoArchivo: f.tipoArchivo,
            observaciones: f.observaciones,
            url: f.url,
            createdAt: f.createdAt.toLocaleDateString("es-CO"),
          }))}
        />
      ),
    },
    {
      id: "mensajes",
      label: `Mensajes (${s.messages.length})`,
      content: (
        <MessagesPanel
          specialDesignId={s.id}
          messages={s.messages.map((m) => ({
            id: m.id,
            body: m.body,
            userName: m.user?.name ?? null,
            createdAt: dateTime(m.createdAt),
          }))}
        />
      ),
    },
    {
      id: "historico",
      label: "Histórico",
      content: (
        <Timeline
          items={activities.map((a) => ({
            id: a.id,
            accion: a.accion,
            observaciones: a.observaciones,
            fechaHora: a.fechaHora,
            userName: a.user?.name ?? null,
            auto: a.auto,
          }))}
        />
      ),
    },
  ];

  return (
    <div>
      <Link
        href="/especiales"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Biblioteca Especiales
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{s.codigo}</h1>
        <Badge variant={specialEstadoVariant(s.estado)}>{s.estado}</Badge>
        {s.order && (
          <Link
            href={`/pedidos/${s.order.id}`}
            className="text-sm text-primary hover:underline"
          >
            Pedido N° {s.order.numero}
          </Link>
        )}
        {s.creador?.name && (
          <span className="text-sm text-muted-foreground">· {s.creador.name}</span>
        )}
      </div>

      <Card className="p-4">
        <TabsLite tabs={tabs} />
      </Card>
    </div>
  );
}
