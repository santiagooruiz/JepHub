import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Eye, Plus } from "lucide-react";

import { db } from "@/lib/db";
import { isStorageConfigured } from "@/lib/storage";
import { requirePermission } from "@/lib/guard";
import { advisorScope } from "@/lib/scope";
import {
  getParamValues,
  ACTION_ACTIVITIES_FALLBACK,
  FILE_TYPES_FALLBACK,
} from "@/lib/params";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TabsLite } from "@/components/ui/tabs-lite";
import { clientDisplayName } from "@/features/clients/queries";
import { AttachmentsPanel } from "@/features/clients/attachments-panel";
import { oppEstadoVariant, probLabel } from "@/features/opportunities/types";
import {
  OpportunityQuotesTable,
  type OpportunityQuoteRow,
} from "@/features/opportunities/opportunity-quotes-table";
import { OpportunityActionsMenu } from "@/features/opportunities/opportunity-actions";
import { formatMoney } from "@/features/quotes/types";
import { orderEstadoVariant } from "@/features/orders/types";
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

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

const th = "whitespace-nowrap px-3 py-2 font-medium";
const td = "px-3 py-2";

export default async function OportunidadDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("view", "opportunities");
  const canEdit = user.ability.can("edit", "opportunities");
  const canDelete = user.ability.can("delete", "opportunities");
  const canEditQuotes = user.ability.can("edit", "quotes");
  const canCreateQuotes = user.ability.can("create", "quotes");
  const { id } = await params;

  // Alcance: un Asesor no puede abrir oportunidades ajenas (404).
  const o = await db.opportunity.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null, ...advisorScope(user) },
    include: {
      client: true,
      advisor: { select: { name: true } },
      quotes: {
        where: { deletedAt: null },
        include: {
          registeredBy: { select: { name: true } },
          order: { select: { id: true } },
          items: true,
          designRequests: {
            where: { deletedAt: null },
            select: { id: true },
            take: 1,
          },
        },
        orderBy: { numero: "desc" },
      },
      orders: {
        where: { deletedAt: null },
        include: { advisor: { select: { name: true } } },
        orderBy: { numero: "desc" },
      },
    },
  });
  if (!o) notFound();

  const [activities, acciones, tiposArchivo, attachments] = await Promise.all([
    db.activity.findMany({
      where: { opportunityId: o.id, companyId: user.companyId },
      include: { user: { select: { name: true } } },
      orderBy: { fechaHora: "desc" },
    }),
    getParamValues(user.companyId, "action_activities", ACTION_ACTIVITIES_FALLBACK),
    getParamValues(user.companyId, "file_types", FILE_TYPES_FALLBACK),
    db.attachment.findMany({
      where: { opportunityId: o.id, companyId: user.companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const hoy = new Date();

  // "Solicitar planos/cambios" desde el menú Acciones: usa la cotización más
  // reciente sin solicitud; si ya existe una, el menú ofrece "Ver en backlog".
  const canRequestDesign = user.ability.can("create", "backlog_design");
  const designRequestId =
    o.quotes.find((q) => q.designRequests.length)?.designRequests[0]?.id ?? null;
  const designQuoteId = designRequestId
    ? null
    : o.quotes.find((q) => !q.designRequests.length)?.id ?? null;

  // Ítems de cotizaciones aprobadas que aún no generaron pedido (solo
  // productos: las carátulas son títulos agrupadores, no ítems reales)
  const disponibles = o.quotes
    .filter((q) => q.estado === "Aprobada" && !q.order)
    .flatMap((q) =>
      q.items
        .filter((it) => it.tipo === "PRODUCTO")
        .map((it) => ({ quote: q, it }))
    );

  const quoteRows: OpportunityQuoteRow[] = o.quotes.map((q) => ({
    id: q.id,
    numero: q.numero,
    registeredBy: q.registeredBy?.name ?? null,
    total: Number(q.total),
    vencida: Boolean(
      q.fechaVencimiento && q.fechaVencimiento < hoy && q.estado !== "Aprobada"
    ),
    fechaVencimiento: q.fechaVencimiento
      ? q.fechaVencimiento.toLocaleDateString("es-CO")
      : null,
    estado: q.estado,
    fechaCreacion: q.createdAt.toLocaleDateString("es-CO"),
    observacion: q.observacion,
    actualizadaEl: q.updatedAt.toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    }),
  }));

  const tabCotizaciones = o.quotes.length ? (
    <OpportunityQuotesTable
      quotes={quoteRows}
      canEdit={canEditQuotes}
      canDuplicate={canCreateQuotes}
    />
  ) : (
    <Empty label="Sin cotizaciones. Crea una con «Nueva cotización»." />
  );

  const tabItems = disponibles.length ? (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className={th}>Cotización</th>
            <th className={th}>Referencia</th>
            <th className={th}>Nombre</th>
            <th className={`${th} text-right`}>Cantidad</th>
            <th className={`${th} text-right`}>Desc.%</th>
            <th className={`${th} text-right`}>Precio</th>
            <th className={`${th} text-right`}>Total</th>
            <th className={td} />
          </tr>
        </thead>
        <tbody>
          {disponibles.map(({ quote, it }) => (
            <tr key={it.id} className="border-b last:border-0 hover:bg-muted/20 align-top">
              <td className={`${td} tabular text-muted-foreground`}>{quote.numero}</td>
              <td className={`${td} font-medium`}>{it.referencia || "—"}</td>
              <td className={td}>
                {it.descripcion || "—"}
                {it.acabados && (
                  <div className="text-xs text-muted-foreground">{it.acabados}</div>
                )}
              </td>
              <td className={`${td} tabular text-right`}>{it.cantidad}</td>
              <td className={`${td} tabular text-right`}>{Number(it.descuentoPct)}%</td>
              <td className={`${td} tabular text-right whitespace-nowrap`}>
                {formatMoney(Number(it.precio))}
              </td>
              <td className={`${td} tabular text-right font-medium whitespace-nowrap`}>
                {formatMoney(Number(it.total))}
              </td>
              <td className={`${td} text-right`}>
                <Link
                  href={`/cotizaciones/${quote.id}`}
                  className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
                >
                  Generar pedido
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty label="Sin ítems disponibles. Los ítems aparecen cuando una cotización está aprobada y aún no tiene pedido." />
  );

  const tabPedidos = o.orders.length ? (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className={th}>N° Pedido</th>
            <th className={th}>Asesor</th>
            <th className={`${th} text-right`}>Total</th>
            <th className={th}>Estado</th>
            <th className={td} />
          </tr>
        </thead>
        <tbody>
          {o.orders.map((p) => (
            <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
              <td className={td}>
                <Link
                  href={`/pedidos/${p.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {p.numero}
                </Link>
              </td>
              <td className={`${td} text-muted-foreground`}>{p.advisor?.name ?? "—"}</td>
              <td className={`${td} tabular text-right whitespace-nowrap`}>
                {formatMoney(Number(p.total))}
              </td>
              <td className={td}>
                <Badge variant={orderEstadoVariant(p.estado)}>{p.estado}</Badge>
              </td>
              <td className={`${td} text-right`}>
                <Link
                  href={`/pedidos/${p.id}`}
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                  aria-label="Ver"
                >
                  <Eye className="size-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty label="Sin pedidos en proceso." />
  );

  return (
    <div>
      <Link
        href="/oportunidades"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Oportunidades
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            N° {o.numero} · {o.nombre}
          </h1>
          <Badge variant={oppEstadoVariant(o.estado)}>{o.estado}</Badge>
        </div>
        <div className="flex gap-2">
          <OpportunityActionsMenu
            id={o.id}
            numero={o.numero}
            clientId={o.clientId}
            canEdit={canEdit}
            canDelete={canDelete}
            canCreateQuotes={canCreateQuotes}
            canRequestDesign={canRequestDesign}
            designQuoteId={designQuoteId}
            designRequestId={designRequestId}
            estado={o.estado}
          />
          {canCreateQuotes && (
            <Button asChild>
              <Link href={`/cotizaciones/nuevo?oportunidadId=${o.id}`}>
                <Plus className="size-4" /> Nueva cotización
              </Link>
            </Button>
          )}
        </div>
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
            <Row
              label="Cantidad de puestos"
              value={o.cantidadPuestos !== null ? String(o.cantidadPuestos) : null}
            />
            <Row
              label="Área a cubrir"
              value={o.areaCubrir !== null ? `${Number(o.areaCubrir)} m²` : null}
            />
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
            {o.observaciones && (
              <div className="py-1.5 text-sm">
                <span className="text-muted-foreground">Observaciones</span>
                <p className="mt-1 whitespace-pre-wrap font-medium">{o.observaciones}</p>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-4">
            <TabsLite
              tabs={[
                {
                  id: "quo",
                  label: `Cotizaciones (${o.quotes.length})`,
                  content: tabCotizaciones,
                },
                {
                  id: "items",
                  label: `Ítems disponibles para pedidos (${disponibles.length})`,
                  content: tabItems,
                },
                {
                  id: "ord",
                  label: `Pedidos en proceso (${o.orders.length})`,
                  content: tabPedidos,
                },
              ]}
            />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Archivos</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              <AttachmentsPanel
                opportunityId={o.id}
                tipos={tiposArchivo}
                canUpload={isStorageConfigured()}
                attachments={attachments.map((a) => ({
                  id: a.id,
                  tipoArchivo: a.tipoArchivo,
                  observaciones: a.observaciones,
                  url: a.url,
                  nombre: a.nombre,
                  size: a.size,
                  createdAt: a.createdAt.toLocaleDateString("es-CO"),
                }))}
              />
            </div>
          </Card>
        </div>

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
