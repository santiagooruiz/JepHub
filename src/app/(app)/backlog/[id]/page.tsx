import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timeline } from "@/features/activity/timeline";
import { getDesignRequest, listCompanyUsers } from "@/features/design/queries";
import { backlogEstadoVariant, BACKLOG_ESTADO_FINAL } from "@/features/design/types";
import {
  DesignStateSelect,
  AssignDesigner,
  EntregablesForm,
  PlanningForm,
  ConvertToSpecialButton,
} from "@/features/design/backlog-controls";

export const dynamic = "force-dynamic";

export default async function BacklogDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("view", "backlog_design");
  const canEdit = user.ability.can("edit", "backlog_design");
  const canAssign = user.ability.can("assign_designer", "backlog_design");
  const canConvert = user.ability.can("create", "special_designs");
  const { id } = await params;

  const dr = await getDesignRequest(user.companyId, id);
  if (!dr) notFound();

  const [users, activities] = await Promise.all([
    canAssign ? listCompanyUsers(user.companyId) : Promise.resolve([]),
    db.activity.findMany({
      where: { designRequestId: dr.id, companyId: user.companyId },
      include: { user: { select: { name: true } } },
      orderBy: { fechaHora: "desc" },
    }),
  ]);

  const planningValues = {
    descripcion: dr.descripcion,
    datosEntrada: dr.datosEntrada,
    requisitosTecnicos: dr.requisitosTecnicos,
    requisitosFuncionales: dr.requisitosFuncionales,
    posiblesFallos: dr.posiblesFallos,
    requisitosLegales: dr.requisitosLegales,
    disenosPrevios: dr.disenosPrevios,
  };

  return (
    <div>
      <Link
        href="/backlog"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Backlog Diseño
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Producto de diseño N° {dr.numero}
        </h1>
        <Badge variant={backlogEstadoVariant(dr.estado)}>{dr.estado}</Badge>
        {dr.quote ? (
          <Link
            href={`/cotizaciones/${dr.quote.id}`}
            className="text-sm text-primary hover:underline"
          >
            Cotización N° {dr.quote.numero}
          </Link>
        ) : (
          <Badge variant="secondary">INTERNO</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Planificación PR-DI-01 */}
        <Card className="p-4">
          <CardTitle className="mb-4 text-base">
            Planificación de diseño &amp; desarrollo (PR-DI-01)
          </CardTitle>
          <PlanningForm id={dr.id} values={planningValues} canEdit={canEdit} />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estado y asignación</CardTitle>
            </CardHeader>
            <div className="space-y-3 px-4 pb-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Estado</span>
                {canEdit ? (
                  <DesignStateSelect id={dr.id} estado={dr.estado} />
                ) : (
                  <Badge variant={backlogEstadoVariant(dr.estado)}>{dr.estado}</Badge>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Diseñador</span>
                {canAssign ? (
                  <AssignDesigner id={dr.id} designerId={dr.designerId} users={users} />
                ) : (
                  <p className="text-sm">{dr.designer?.name ?? "— Sin asignar —"}</p>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entregables de diseño</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              {canEdit ? (
                <EntregablesForm
                  id={dr.id}
                  values={{
                    despiece: dr.despiece,
                    armadoGeneral: dr.armadoGeneral,
                    planosTecnicos: dr.planosTecnicos,
                    nPedidoOfimatica: dr.nPedidoOfimatica,
                  }}
                />
              ) : (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>Despiece: {dr.despiece || "—"}</div>
                  <div>Armado general: {dr.armadoGeneral || "—"}</div>
                  <div>Planos técnicos: {dr.planosTecnicos || "—"}</div>
                </div>
              )}
            </div>
          </Card>

          {canConvert && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Biblioteca Especiales</CardTitle>
              </CardHeader>
              <div className="px-4 pb-4">
                <ConvertToSpecialButton
                  id={dr.id}
                  disabled={dr.estado !== BACKLOG_ESTADO_FINAL}
                  specialId={dr.special?.id ?? null}
                />
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico</CardTitle>
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
