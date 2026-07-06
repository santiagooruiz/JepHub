import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Eye, Plus } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TabsLite } from "@/components/ui/tabs-lite";
import { clientDisplayName } from "@/features/clients/queries";
import { oppEstadoVariant, probLabel } from "@/features/opportunities/types";
import { quoteEstadoVariant, formatMoney } from "@/features/quotes/types";
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
  const canEditQuotes = user.ability.can("edit", "quotes");
  const canCreateQuotes = user.ability.can("create", "quotes");
  const { id } = await params;

  const o = await db.opportunity.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    include: {
      client: true,
      advisor: { select: { name: true } },
      quotes: {
        where: { deletedAt: null },
        include: {
          registeredBy: { select: { name: true } },
          order: { select: { id: true } },
          items: true,
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

  const hoy = new Date();

  // Ítems de cotizaciones aprobadas que aún no generaron pedido
  const disponibles = o.quotes
    .filter((q) => q.estado === "Aprobada" && !q.order)
    .flatMap((q) => q.items.map((it) => ({ quote: q, it })));

  const tabCotizaciones = o.quotes.length ? (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className={th}>N°</th>
            <th className={th}>Registrado por</th>
            <th className={`${th} text-right`}>Total</th>
            <th className={th}>Plazo</th>
            <th className={th}>Estado</th>
            <th className={td} />
          </tr>
        </thead>
        <tbody>
          {o.quotes.map((q) => {
            const vencida =
              q.fechaVencimiento && q.fechaVencimiento < hoy && q.estado !== "Aprobada";
            return (
              <tr key={q.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className={td}>
                  <Link
                    href={`/cotizaciones/${q.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {q.numero}
                  </Link>
                </td>
                <td className={`${td} text-muted-foreground`}>
                  {q.registeredBy?.name ?? "—"}
                </td>
                <td className={`${td} tabular text-right whitespace-nowrap`}>
                  {formatMoney(Number(q.total))}
                </td>
                <td className={td}>
                  {vencida ? (
                    <Badge variant="destructive">Vencida</Badge>
                  ) : (
                    <span className="text-muted-foreground">
                      {q.fechaVencimiento
                        ? q.fechaVencimiento.toLocaleDateString("es-CO")
                        : "—"}
                    </span>
                  )}
                </td>
                <td className={td}>
                  <Badge variant={quoteEstadoVariant(q.estado)}>{q.estado}</Badge>
                </td>
                <td className={`${td} text-right`}>
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/cotizaciones/${q.id}`}
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                      aria-label="Ver"
                    >
                      <Eye className="size-4" />
                    </Link>
                    {canEditQuotes && (
                      <Link
                        href={`/cotizaciones/${q.id}/editar`}
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                        aria-label="Editar"
                      >
                        <Pencil className="size-4" />
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={`/oportunidades/${o.id}/editar`}>
                <Pencil className="size-4" /> Editar
              </Link>
            </Button>
          )}
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
