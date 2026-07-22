import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, FileText } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { quoteScope } from "@/lib/scope";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clientDisplayName } from "@/features/clients/queries";
import { LineItemsTable } from "@/features/quotes/line-items-table";
import {
  quoteEstadoVariant,
  formatMoney,
  esItemEspecial,
} from "@/features/quotes/types";
import { QuoteStateSelect } from "@/features/quotes/state-select";
import { SignaturePanel } from "@/features/quotes/signature-panel";
import { GenerateOrderButton } from "@/features/orders/order-controls";
import { DesignRequestsPanel } from "@/features/design/design-requests-panel";
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

  // Alcance: un Asesor no puede abrir cotizaciones ajenas (404).
  const q = await db.quote.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null, ...quoteScope(user) },
    include: {
      client: true,
      opportunity: { select: { id: true, numero: true, nombre: true } },
      registeredBy: { select: { name: true } },
      items: { orderBy: [{ posicion: "asc" }, { id: "asc" }] },
      signature: {
        select: {
          estado: true,
          firmaImagen: true,
          firmanteNombre: true,
          firmadaEn: true,
        },
      },
      order: { select: { id: true } },
    },
  });
  if (!q) notFound();
  const canRequestDesign = user.ability.can("create", "backlog_design");
  const canCreateOrder = user.ability.can("create", "orders");

  // Las validaciones aplican solo a productos: las carátulas son títulos
  // agrupadores sin referencia ni acabados propios.
  const productos = q.items.filter((it) => it.tipo === "PRODUCTO");
  // Ítems con acabados pendientes: el asesor debe resolverlos (diseño/planos)
  const porDefinir = productos.filter((it) =>
    it.acabados?.toUpperCase().includes("POR DEFINIR")
  );
  const especiales = productos.filter((it) => esItemEspecial(it.referencia));
  const sinReferencia = productos.filter((it) => !it.referencia?.trim());
  // Motivo por el que aún no se puede generar el pedido (validaciones previas).
  // La guardia autoritativa está en generateOrderFromQuote (server action).
  const motivoBloqueo: string | null =
    productos.length === 0
      ? "La cotización no tiene ítems."
      : especiales.length > 0
        ? `Hay ${especiales.length} ítem(s) ESPECIAL pendientes de diseño. Reemplázalos por la referencia definitiva antes de generar el pedido.`
        : porDefinir.length > 0
          ? "Define los acabados de los ítems “POR DEFINIR” antes de generar el pedido."
          : !q.client.numeroDocumento?.trim()
            ? "El cliente no tiene número de documento (NIT), requerido para generar el pedido."
            : sinReferencia.length > 0
              ? `Hay ${sinReferencia.length} ítem(es) sin referencia (código). Complétalos antes de generar el pedido.`
              : null;

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
            <div className="text-sm">
              <span className="text-muted-foreground">Cliente: </span>
              <Link
                href={`/clientes/${q.clientId}`}
                className="font-medium text-primary hover:underline"
              >
                {clientDisplayName(q.client)}
              </Link>
            </div>
            <Info label="Registrado por" value={q.registeredBy?.name} />
            {q.opportunity ? (
              <div className="text-sm">
                <span className="text-muted-foreground">Oportunidad: </span>
                <Link
                  href={`/oportunidades/${q.opportunity.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  N° {q.opportunity.numero} · {q.opportunity.nombre}
                </Link>
              </div>
            ) : (
              <Info label="Oportunidad" value={null} />
            )}
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

          <LineItemsTable
            conDescuento
            items={q.items.map((it) => ({
              id: it.id,
              tipo: it.tipo,
              parentId: it.parentId,
              referencia: it.referencia,
              descripcion: it.descripcion,
              acabados: it.acabados,
              esArea: it.esArea,
              largo: it.largo === null ? null : Number(it.largo),
              ancho: it.ancho === null ? null : Number(it.ancho),
              figura: it.figura,
              imagen: it.imagen,
              precio: Number(it.precio),
              cantidad: it.cantidad,
              descuentoPct: Number(it.descuentoPct),
              total: Number(it.total),
            }))}
          />

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
          {porDefinir.length > 0 && (
            <Card className="border-l-4 border-l-[hsl(var(--destructive))]">
              <CardHeader>
                <CardTitle className="text-base">
                  Producto por definir acabados
                </CardTitle>
              </CardHeader>
              <div className="space-y-3 px-4 pb-4">
                {porDefinir.map((it) => (
                  <div key={it.id} className="text-sm">
                    <p className="font-medium">{it.descripcion || it.referencia}</p>
                    {it.referencia && (
                      <p className="text-muted-foreground">
                        Código: {it.referencia}
                      </p>
                    )}
                    {it.acabados && (
                      <p className="text-xs text-muted-foreground">{it.acabados}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Firma del cliente</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              <SignaturePanel
                quoteId={q.id}
                estado={q.signature?.estado ?? null}
                firmaImagen={q.signature?.firmaImagen ?? null}
                firmanteNombre={q.signature?.firmanteNombre ?? null}
                firmadaEn={
                  q.signature?.firmadaEn?.toLocaleString("es-CO") ?? null
                }
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
                !canCreateOrder ? (
                  <p className="text-sm text-muted-foreground">
                    Tu rol no tiene permiso para generar pedidos.
                  </p>
                ) : motivoBloqueo ? (
                  <p className="text-sm text-[hsl(var(--destructive))]">
                    {motivoBloqueo}
                  </p>
                ) : (
                  <GenerateOrderButton quoteId={q.id} />
                )
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
                <CardTitle className="text-base">Solicitudes de plano comercial</CardTitle>
              </CardHeader>
              <div className="px-4 pb-4">
                <DesignRequestsPanel
                  companyId={user.companyId}
                  quoteId={q.id}
                  canCreate={canRequestDesign}
                  canEdit={user.ability.can("edit", "backlog_design")}
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
