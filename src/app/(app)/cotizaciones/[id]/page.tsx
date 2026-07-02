import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, FileText } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clientDisplayName } from "@/features/clients/queries";
import { quoteEstadoVariant, formatMoney } from "@/features/quotes/types";
import { QuoteStateSelect } from "@/features/quotes/state-select";
import { SignaturePanel } from "@/features/quotes/signature-panel";
import { GenerateOrderButton } from "@/features/orders/order-controls";
import { RequestDesignButton } from "@/features/design/request-design-button";
import { RegisterActivity } from "@/features/activity/register-activity";
import { Timeline } from "@/features/activity/timeline";

export const dynamic = "force-dynamic";

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

export default async function CotizacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("view", "quotes");
  const canEdit = user.ability.can("edit", "quotes");
  const { id } = await params;

  const q = await db.quote.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    include: {
      client: true,
      opportunity: { select: { id: true, numero: true, nombre: true } },
      registeredBy: { select: { name: true } },
      items: true,
      signature: { select: { estado: true } },
      order: { select: { id: true } },
      designRequests: {
        where: { deletedAt: null },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!q) notFound();
  const canRequestDesign = user.ability.can("create", "backlog_design");

  const [activities, param] = await Promise.all([
    db.activity.findMany({
      where: { quoteId: q.id, companyId: user.companyId },
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
        href="/cotizaciones"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Cotizaciones
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Cotización N° {q.numero}
          </h1>
          <Badge variant={quoteEstadoVariant(q.estado)}>{q.estado}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && <QuoteStateSelect id={q.id} estado={q.estado} />}
          <Button asChild variant="outline">
            <a
              href={`/print/cotizacion/${q.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <FileText className="size-4" /> PDF
            </a>
          </Button>
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={`/cotizaciones/${q.id}/editar`}>
                <Pencil className="size-4" /> Editar
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Documento */}
        <Card className="p-4">
          <div className="mb-4 grid grid-cols-1 gap-1 sm:grid-cols-2">
            <Info label="Cliente" value={clientDisplayName(q.client)} />
            <Info label="Registrado por" value={q.registeredBy?.name} />
            <Info label="Oportunidad" value={q.opportunity?.nombre} />
            <Info label="Forma de pago" value={q.formaPago} />
            <Info label="Tiempo de entrega" value={q.tiempoEntrega} />
            <Info
              label="Vencimiento"
              value={
                q.fechaVencimiento
                  ? q.fechaVencimiento.toLocaleDateString("es-CO")
                  : null
              }
            />
            <Info label="Orden de compra" value={q.ordenCompra} />
            <Info label="Dirección de envío" value={q.direccionEnvio} />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Referencia</th>
                  <th className="px-3 py-2 font-medium">Descripción</th>
                  <th className="px-3 py-2 text-right font-medium">Precio</th>
                  <th className="px-3 py-2 text-right font-medium">Cant.</th>
                  <th className="px-3 py-2 text-right font-medium">Desc.%</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {q.items.map((it) => (
                  <tr key={it.id} className="border-b last:border-0 align-top">
                    <td className="px-3 py-2 font-medium">{it.referencia || "—"}</td>
                    <td className="px-3 py-2">
                      {it.descripcion || "—"}
                      {it.acabados && (
                        <div className="text-xs text-muted-foreground">{it.acabados}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular whitespace-nowrap">
                      {formatMoney(Number(it.precio))}
                    </td>
                    <td className="px-3 py-2 text-right tabular">{it.cantidad}</td>
                    <td className="px-3 py-2 text-right tabular">
                      {Number(it.descuentoPct)}%
                    </td>
                    <td className="px-3 py-2 text-right tabular font-medium whitespace-nowrap">
                      {formatMoney(Number(it.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular">{formatMoney(Number(q.subtotal))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA (19%)</span>
                <span className="tabular">{formatMoney(Number(q.impuesto))}</span>
              </div>
              <div className="flex justify-between border-t pt-1 text-base font-bold">
                <span>Total</span>
                <span className="tabular">{formatMoney(Number(q.total))}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Firma + Actividad */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Firma del cliente</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              <SignaturePanel
                quoteId={q.id}
                estado={q.signature?.estado ?? null}
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pedido</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              {q.order ? (
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/pedidos/${q.order.id}`}>Ver pedido</Link>
                </Button>
              ) : q.estado === "Aprobada" ? (
                <GenerateOrderButton quoteId={q.id} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aprueba la cotización para generar el pedido.
                </p>
              )}
            </div>
          </Card>

          {canRequestDesign && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Diseño</CardTitle>
              </CardHeader>
              <div className="px-4 pb-4">
                <RequestDesignButton
                  quoteId={q.id}
                  designRequestId={q.designRequests[0]?.id ?? null}
                />
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registro de actividad</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              <RegisterActivity entityType="QUOTE" entityId={q.id} acciones={acciones} />
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
