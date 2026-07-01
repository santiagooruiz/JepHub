import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clientDisplayName } from "@/features/clients/queries";
import { formatMoney } from "@/features/quotes/types";
import { orderEstadoVariant } from "@/features/orders/types";
import {
  OrderStateSelect,
  ApprovalsPanel,
  OfimaticaPanel,
} from "@/features/orders/order-controls";
import { RegisterActivity } from "@/features/activity/register-activity";
import { Timeline } from "@/features/activity/timeline";

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
  const { id } = await params;

  const o = await db.order.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    include: {
      client: true,
      advisor: { select: { name: true } },
      quote: { select: { numero: true } },
      items: true,
      approvals: { include: { approvedBy: { select: { name: true } } } },
      erpSync: true,
    },
  });
  if (!o) notFound();

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
          <Badge variant={orderEstadoVariant(o.estado)}>{o.estado}</Badge>
          <Badge variant="secondary">{o.tipoProducto}</Badge>
        </div>
        {canEdit && <OrderStateSelect id={o.id} estado={o.estado} />}
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

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Referencia</th>
                  <th className="px-3 py-2 font-medium">Descripción</th>
                  <th className="px-3 py-2 text-right font-medium">Precio</th>
                  <th className="px-3 py-2 text-right font-medium">Cant.</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((it) => (
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
              <CardTitle className="text-base">Aprobaciones</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              <ApprovalsPanel
                orderId={o.id}
                approvals={o.approvals.map((a) => ({
                  kind: a.kind,
                  aprobado: a.aprobado,
                  approvedBy: a.approvedBy?.name ?? null,
                  fecha: fmtDate(a.fecha),
                }))}
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
                erp={{
                  estadoEnvio: o.erpSync?.estadoEnvio ?? null,
                  nPedidoOfimatica: o.erpSync?.nPedidoOfimatica ?? null,
                  fechaEnvio: fmtDate(o.erpSync?.fechaEnvio ?? null),
                  fechaTapiceria: fmtDate(o.erpSync?.fechaTapiceria ?? null),
                  fechaListo: fmtDate(o.erpSync?.fechaListo ?? null),
                  fechaDespacho: fmtDate(o.erpSync?.fechaDespacho ?? null),
                }}
              />
            </div>
          </Card>

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
