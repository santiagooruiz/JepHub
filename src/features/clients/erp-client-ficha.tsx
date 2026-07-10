import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Eye, Truck, Wallet } from "lucide-react";

import { db } from "@/lib/db";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { TabsLite } from "@/components/ui/tabs-lite";
import { formatMoney } from "@/features/quotes/types";
import { oppEstadoVariant } from "@/features/opportunities/types";
import { RegisterActivity } from "@/features/activity/register-activity";
import { Timeline } from "@/features/activity/timeline";
import {
  getErpClientByNit,
  getErpClientCartera,
  getErpClientDocs,
} from "@/server/ofimatica/clients";
import { AttachmentsPanel } from "./attachments-panel";
import { ErpContactsPanel } from "./erp-contacts-panel";
import { NewOpportunityButton } from "./new-opportunity-button";
import { estadoVariant, type ErpClientDocRow } from "./types";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-words">{value || "—"}</span>
    </div>
  );
}

/** Tabla de Oportunidades (PostgreSQL): enlaza a su detalle. */
function OppTable({
  rows,
}: {
  rows: { id: string; numero: number; nombre: string; asesor: string; estado: string; variant: BadgeProps["variant"] }[];
}) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
        Sin oportunidades.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-3 py-2 font-medium">N°</th>
            <th className="px-3 py-2 font-medium">Nombre de la oportunidad</th>
            <th className="px-3 py-2 font-medium">Asesor</th>
            <th className="px-3 py-2 font-medium">Estado</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
              <td className="tabular px-3 py-2 text-muted-foreground">{r.numero}</td>
              <td className="px-3 py-2">
                <Link href={`/oportunidades/${r.id}`} className="font-medium text-primary hover:underline">
                  {r.nombre}
                </Link>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{r.asesor}</td>
              <td className="px-3 py-2">
                <Badge variant={r.variant}>{r.estado}</Badge>
              </td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/oportunidades/${r.id}`}
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
  );
}

/** Tabla de Cotizaciones/Pedidos (ERP TRADE). */
function ErpDocTable({ rows, emptyLabel }: { rows: ErpClientDocRow[]; emptyLabel: string }) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
        Sin {emptyLabel}.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-3 py-2 font-medium">N°</th>
            <th className="px-3 py-2 font-medium">Fecha</th>
            <th className="px-3 py-2 text-right font-medium">Valor</th>
            <th className="px-3 py-2 font-medium">Orden compra</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.numero} className="border-b last:border-0 hover:bg-muted/20">
              <td className="tabular px-3 py-2 font-medium">{r.numero}</td>
              <td className="tabular px-3 py-2 text-muted-foreground">{r.fecha || "—"}</td>
              <td className="tabular px-3 py-2 text-right">{formatMoney(r.valor)}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.orden || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export async function ErpClientFicha({
  nit,
  companyId,
  canCreateOpp,
  canManageContacts,
  allowedCodvens,
}: {
  nit: string;
  companyId: string;
  canCreateOpp: boolean;
  canManageContacts: boolean;
  /** Alcance por asesor: si viene, el cliente debe pertenecer a uno de estos codven. */
  allowedCodvens?: string[];
}) {
  const erp = await getErpClientByNit(nit);
  if (!erp) notFound();

  // Rol Asesor: no puede abrir clientes de otro asesor (ni por URL directa).
  if (allowedCodvens !== undefined && !allowedCodvens.includes(erp.codven)) {
    notFound();
  }

  const [cartera, cotizaciones, pedidos, anchor, param] = await Promise.all([
    getErpClientCartera(nit),
    getErpClientDocs(nit, "CV"),
    getErpClientDocs(nit, "PD"),
    // Ancla en PostgreSQL (relación por NIT). Solo lectura aquí; se crea al escribir.
    db.client.findFirst({
      where: { companyId, numeroDocumento: nit, deletedAt: null },
      include: {
        opportunities: {
          where: { deletedAt: null },
          include: { advisor: { select: { name: true } } },
          orderBy: { numero: "desc" },
        },
        activities: {
          include: { user: { select: { name: true } } },
          orderBy: { fechaHora: "desc" },
        },
        attachments: { orderBy: { createdAt: "desc" } },
      },
    }),
    db.parameter.findUnique({
      where: { companyId_key: { companyId, key: "action_activities" } },
    }),
  ]);

  const acciones = Array.isArray(param?.value)
    ? (param!.value as { value?: string }[]).map((o) => o.value ?? "").filter(Boolean)
    : ["Llamada", "Visita", "Email", "Observación"];

  const opps = (anchor?.opportunities ?? []).map((o) => ({
    id: o.id,
    numero: o.numero,
    nombre: o.nombre,
    asesor: o.advisor?.name ?? "—",
    estado: o.estado,
    variant: oppEstadoVariant(o.estado),
  }));

  const anchorInfo = { nit: erp.nit, nombre: erp.nombre, esEmpresa: erp.tipo === "Empresa" };

  return (
    <div>
      <Link
        href="/clientes"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Clientes
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{erp.nombre}</h1>
          <Badge variant="secondary">{erp.tipo}</Badge>
          <Badge variant={estadoVariant(erp.estado)}>{erp.estado}</Badge>
          {erp.esProveedor && (
            <Badge variant="muted">
              <Truck className="size-3" /> También proveedor
            </Badge>
          )}
        </div>
        {canCreateOpp && <NewOpportunityButton anchor={anchorInfo} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr_340px]">
        {/* Izquierda: datos + contactos */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información básica</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              <Row label="Tipo" value={erp.tipo === "Empresa" ? "Empresa" : "Persona"} />
              <Row label="Email" value={erp.email} />
              <Row label="Teléfono" value={erp.tel1} />
              <Row label="Tipo Documento" value="NIT" />
              <Row label="Número Documento" value={erp.nit} />
              <Row label="Dirección" value={erp.direccion} />
              <Row label="Ciudad" value={erp.ciudad} />
              <Row label="Asesor" value={erp.asesor} />
              {erp.canal && <Row label="Canal" value={erp.canal} />}
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <ErpContactsPanel
                nit={erp.nit}
                contacts={erp.contacts}
                canManage={canManageContacts}
              />
            </div>
          </Card>
        </div>

        {/* Centro: tabs + archivos */}
        <div className="space-y-6">
          <Card className="p-4">
            <TabsLite
              tabs={[
                {
                  id: "opp",
                  label: `Oportunidades (${opps.length})`,
                  content: <OppTable rows={opps} />,
                },
                {
                  id: "cot",
                  label: `Cotizaciones (${cotizaciones.length})`,
                  content: <ErpDocTable rows={cotizaciones} emptyLabel="cotizaciones" />,
                },
                {
                  id: "ped",
                  label: `Pedidos (${pedidos.length})`,
                  content: <ErpDocTable rows={pedidos} emptyLabel="pedidos" />,
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
                anchor={anchorInfo}
                attachments={(anchor?.attachments ?? []).map((a) => ({
                  id: a.id,
                  tipoArchivo: a.tipoArchivo,
                  observaciones: a.observaciones,
                  url: a.url,
                  createdAt: a.createdAt.toLocaleDateString("es-CO"),
                }))}
              />
            </div>
          </Card>
        </div>

        {/* Derecha: saldo + registrar actividad + timeline */}
        <div className="space-y-6">
          <Card className="flex items-center gap-3 bg-primary p-4 text-primary-foreground">
            <Wallet className="size-8 opacity-80" />
            <div>
              <p className="text-sm text-primary-foreground/80">Saldo Cartera</p>
              <p className="tabular text-xl font-bold">{formatMoney(cartera.totalSaldo)}</p>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registro de actividad</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              <RegisterActivity entityType="CLIENT" anchor={anchorInfo} acciones={acciones} />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actividad</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              <Timeline
                items={(anchor?.activities ?? []).map((a) => ({
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
