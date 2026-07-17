import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { advisorScope } from "@/lib/scope";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clientDisplayName } from "@/features/clients/queries";
import { LineItemsTable } from "@/features/quotes/line-items-table";
import { formatMoney } from "@/features/quotes/types";
import { orderEstadoVariant, deriveErpApprovals } from "@/features/orders/types";
import {
  OrderStateSelect,
  ApprovalsPanel,
  OfimaticaPanel,
} from "@/features/orders/order-controls";
import { RegisterActivity } from "@/features/activity/register-activity";
import { Timeline } from "@/features/activity/timeline";
import { RequestFichaTecnicaButton } from "@/features/design/request-design-button";
import { resolveErpStatus } from "@/server/ofimatica/status";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string | null {
  return d ? d.toLocaleDateString("es-CO") : null;
}
function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

export default async function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("view", "orders");
  const canEdit = user.ability.can("edit", "orders");
  const canManageErp = user.ability.can("send_ofimatica", "orders");
  const canRequestDesign = user.ability.can("create", "backlog_design");
  const { id } = await params;

  // Alcance: un Asesor no puede abrir pedidos ajenos (404).
  const o = await db.order.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null, ...advisorScope(user) },
    include: {
      client: true,
      advisor: { select: { name: true } },
      quote: { select: { numero: true } },
      items: { orderBy: [{ posicion: "asc" }, { id: "asc" }] },
      erpSync: true,
      designRequests: { where: { deletedAt: null }, select: { id: true }, take: 1 },
    },
  });
  if (!o) notFound();

  // Sincroniza con el ERP al abrir: si la cotización (CV) está enviada y aún
  // falta resolver el pedido (PD) o registrar el despacho, consulta el ERP y
  // actualiza (best-effort; no bloquea la página si el ERP falla). Así el estado
  // se refleja sin depender del worker.
  let erp = o.erpSync;
  if (
    erp?.estadoEnvio === "ENVIADO" &&
    erp.nPedidoOfimatica &&
    (!erp.nroPedidoErp || !erp.fechaDespacho)
  ) {
    try {
      await resolveErpStatus(o.id);
      erp = await db.erpSync.findUnique({ where: { orderId: o.id } });
    } catch {
      // Ignora errores del ERP para no romper la vista del pedido.
    }
  }
  const estadoActual =
    erp?.nroPedidoErp && o.estado === "Pendiente Ingreso" ? "En Producción" : o.estado;

  const [activities, param] = await Promise.all([
    db.activity.findMany({
      where: { orderId: o.id, companyId: user.companyId },
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
        href="/pedidos"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Pedidos
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Pedido N° {o.numero}
          </h1>
          <Badge variant={orderEstadoVariant(estadoActual)}>{estadoActual}</Badge>
          <Badge variant="secondary">{o.tipoProducto}</Badge>
        </div>
        {canEdit && <OrderStateSelect id={o.id} estado={estadoActual} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Documento */}
        <Card className="p-4">
          <div className="mb-4 grid grid-cols-1 gap-1 sm:grid-cols-2">
            <Info label="Cliente" value={clientDisplayName(o.client)} />
            <Info label="Asesor" value={o.advisor?.name} />
            <Info
              label="Cotización origen"
              value={o.quote ? `N° ${o.quote.numero}` : null}
            />
            <Info label="Forma de pago" value={o.formaPago} />
            <Info label="Dirección de envío" value={o.direccionEnvio} />
            <Info
              label="Requiere instalación"
              value={o.requiereInstalacion ? "Sí" : "No"}
            />
          </div>

          <LineItemsTable
            items={o.items.map((it) => ({
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
                <span className="tabular">{formatMoney(Number(o.subtotal))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA (19%)</span>
                <span className="tabular">{formatMoney(Number(o.impuesto))}</span>
              </div>
              <div className="flex justify-between border-t pt-1 text-base font-bold">
                <span>Total</span>
                <span className="tabular">{formatMoney(Number(o.total))}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Aprobaciones + ofimática + actividad */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seguimiento</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              <ApprovalsPanel
                items={deriveErpApprovals(
                  {
                    nroPedidoErp: erp?.nroPedidoErp ?? null,
                    fechaTapiceria: erp?.fechaTapiceria ?? null,
                    fechaListo: erp?.fechaListo ?? null,
                    fechaDespacho: erp?.fechaDespacho ?? null,
                  },
                  estadoActual
                )}
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ofimática (ERP)</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              <OfimaticaPanel
                orderId={o.id}
                canManage={canManageErp}
                erp={{
                  nCotizacionErp: erp?.nPedidoOfimatica ?? null,
                  nroPedidoErp: erp?.nroPedidoErp ?? null,
                  estadoEnvio: erp?.estadoEnvio ?? null,
                  ultimoError: erp?.ultimoError ?? null,
                  fechaTapiceria: fmtDate(erp?.fechaTapiceria ?? null),
                  fechaListo: fmtDate(erp?.fechaListo ?? null),
                  fechaDespacho: fmtDate(erp?.fechaDespacho ?? null),
                }}
              />
            </div>
          </Card>

          {canRequestDesign && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Diseño</CardTitle>
              </CardHeader>
              <div className="px-4 pb-4">
                <RequestFichaTecnicaButton
                  orderId={o.id}
                  designRequestId={o.designRequests[0]?.id ?? null}
                />
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registro de actividad</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              <RegisterActivity entityType="ORDER" entityId={o.id} acciones={acciones} />
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
