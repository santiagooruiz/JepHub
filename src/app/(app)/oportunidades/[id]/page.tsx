import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TabsLite } from "@/components/ui/tabs-lite";
import { clientDisplayName } from "@/features/clients/queries";
import { oppEstadoVariant, probLabel } from "@/features/opportunities/types";
import { RegisterActivity } from "@/features/activity/register-activity";
import { Timeline } from "@/features/activity/timeline";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
      Sin {label}. Este módulo se conecta en su sprint.
    </div>
  );
}

export default async function OportunidadDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("view", "opportunities");
  const canEdit = user.ability.can("edit", "opportunities");
  const { id } = await params;

  const o = await db.opportunity.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    include: {
      client: true,
      advisor: { select: { name: true } },
    },
  });
  if (!o) notFound();

  const [activities, param] = await Promise.all([
    db.activity.findMany({
      where: { opportunityId: o.id, companyId: user.companyId },
      include: { user: { select: { name: true } } },
      orderBy: { fechaHora: "desc" },
    }),
    db.parameter.findUnique({
      where: {
        companyId_key: { companyId: user.companyId, key: "action_activities" },
      },
    }),
  ]);
  const acciones = Array.isArray(param?.value)
    ? (param!.value as { value?: string }[]).map((a) => a.value ?? "").filter(Boolean)
    : ["Llamada", "Visita", "Email", "Observación"];

  return (
    <div>
      <Link
        href="/oportunidades"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Oportunidades
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            N° {o.numero} · {o.nombre}
          </h1>
          <Badge variant={oppEstadoVariant(o.estado)}>{o.estado}</Badge>
        </div>
        {canEdit && (
          <Button asChild variant="outline">
            <Link href={`/oportunidades/${o.id}/editar`}>
              <Pencil className="size-4" /> Editar
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos</CardTitle>
          </CardHeader>
          <div className="px-4 pb-4">
            <div className="flex justify-between gap-4 py-1.5 text-sm">
              <span className="text-muted-foreground">Cliente</span>
              <Link
                href={`/clientes/${o.clientId}`}
                className="text-right font-medium text-primary hover:underline"
              >
                {clientDisplayName(o.client)}
              </Link>
            </div>
            <Row label="Contacto" value={o.contacto} />
            <Row label="Asesor" value={o.advisor?.name} />
            <Row label="Probabilidad" value={probLabel(o.probabilidad)} />
            <Row
              label="Cierre proyectado"
              value={
                o.fechaCierreProyectada
                  ? o.fechaCierreProyectada.toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "2-digit",
                    })
                  : null
              }
            />
          </div>
        </Card>

        <Card className="p-4">
          <TabsLite
            tabs={[
              { id: "quo", label: "Cotizaciones", content: <EmptyTab label="cotizaciones" /> },
              { id: "items", label: "Ítems para pedidos", content: <EmptyTab label="ítems" /> },
              { id: "ord", label: "Pedidos", content: <EmptyTab label="pedidos" /> },
            ]}
          />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registro de actividad</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              <RegisterActivity
                entityType="OPPORTUNITY"
                entityId={o.id}
                acciones={acciones}
              />
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actividad</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
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
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
