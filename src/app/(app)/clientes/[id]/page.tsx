import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Eye, Plus, Wallet } from "lucide-react";

import { db } from "@/lib/db";
import { isStorageConfigured } from "@/lib/storage";
import { requirePermission } from "@/lib/guard";
import {
  getParamValues,
  ACTION_ACTIVITIES_FALLBACK,
  FILE_TYPES_FALLBACK,
} from "@/lib/params";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TabsLite } from "@/components/ui/tabs-lite";
import { clientDisplayName } from "@/features/clients/queries";
import { estadoVariant } from "@/features/clients/types";
import { oppEstadoVariant } from "@/features/opportunities/types";
import { quoteEstadoVariant, formatMoney } from "@/features/quotes/types";
import { orderEstadoVariant } from "@/features/orders/types";
import { ContactsPanel } from "@/features/clients/contacts-panel";
import { AttachmentsPanel } from "@/features/clients/attachments-panel";
import { ErpClientFicha } from "@/features/clients/erp-client-ficha";
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

type RelRow = {
  id: string;
  href: string;
  numero: number;
  detalle: string;
  extra: string;
  estado: string;
  variant: BadgeProps["variant"];
};

function RelTable({
  rows,
  detalleHeader,
  extraHeader,
  emptyLabel,
}: {
  rows: RelRow[];
  detalleHeader: string;
  extraHeader: string;
  emptyLabel: string;
}) {
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
            <th className="whitespace-nowrap px-3 py-2 font-medium">N°</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">{detalleHeader}</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">{extraHeader}</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">Estado</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
              <td className="tabular px-3 py-2 text-muted-foreground">{r.numero}</td>
              <td className="px-3 py-2">
                <Link href={r.href} className="font-medium text-primary hover:underline">
                  {r.detalle}
                </Link>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{r.extra}</td>
              <td className="px-3 py-2">
                <Badge variant={r.variant}>{r.estado}</Badge>
              </td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={r.href}
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

export default async function ClienteFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("view", "clients");
  const canEdit = user.ability.can("edit", "clients");
  const canManageContacts = user.ability.can("createcontact", "clients");
  const canCreateOpp = user.ability.can("create", "opportunities");
  const { id } = await params;

  // El listado sale del ERP y usa el NIT como id; la ficha CRM local usa el cuid
  // de Prisma (patrón `c` + 24 alfanuméricos). Todo lo que NO sea un cuid se trata
  // como NIT → ficha híbrida del ERP (datos del ERP + oportunidades/actividad/
  // archivos de PostgreSQL, relación por NIT).
  if (!/^c[a-z0-9]{24}$/.test(id)) {
    return (
      <ErpClientFicha
        nit={id}
        companyId={user.companyId}
        canCreateOpp={canCreateOpp}
        canManageContacts={canManageContacts}
        canEdit={canEdit}
        // Un Asesor solo puede abrir clientes de sus propios codven.
        allowedCodvens={user.roleName === "Asesor" ? user.codvens : undefined}
      />
    );
  }

  const c = await db.client.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    include: {
      advisor: { select: { name: true } },
      priceList: true,
      sector: true,
      subSector: true,
      contacts: { orderBy: { nombre: "asc" } },
      activities: {
        include: { user: { select: { name: true } } },
        orderBy: { fechaHora: "desc" },
      },
      attachments: { orderBy: { createdAt: "desc" } },
      opportunities: {
        where: { deletedAt: null },
        include: { advisor: { select: { name: true } } },
        orderBy: { numero: "desc" },
      },
      quotes: {
        where: { deletedAt: null },
        include: { opportunity: { select: { nombre: true } } },
        orderBy: { numero: "desc" },
      },
      orders: {
        where: { deletedAt: null },
        include: { opportunity: { select: { nombre: true } } },
        orderBy: { numero: "desc" },
      },
    },
  });
  if (!c) notFound();

  const [acciones, tiposArchivo] = await Promise.all([
    getParamValues(user.companyId, "action_activities", ACTION_ACTIVITIES_FALLBACK),
    getParamValues(user.companyId, "file_types", FILE_TYPES_FALLBACK),
  ]);

  const opps: RelRow[] = c.opportunities.map((o) => ({
    id: o.id,
    href: `/oportunidades/${o.id}`,
    numero: o.numero,
    detalle: o.nombre,
    extra: o.advisor?.name ?? "—",
    estado: o.estado,
    variant: oppEstadoVariant(o.estado),
  }));
  const quotes: RelRow[] = c.quotes.map((q) => ({
    id: q.id,
    href: `/cotizaciones/${q.id}`,
    numero: q.numero,
    detalle: q.opportunity?.nombre ?? `Cotización ${q.numero}`,
    extra: formatMoney(Number(q.total)),
    estado: q.estado,
    variant: quoteEstadoVariant(q.estado),
  }));
  const orders: RelRow[] = c.orders.map((o) => ({
    id: o.id,
    href: `/pedidos/${o.id}`,
    numero: o.numero,
    detalle: o.opportunity?.nombre ?? `Pedido ${o.numero}`,
    extra: formatMoney(Number(o.total)),
    estado: o.estado,
    variant: orderEstadoVariant(o.estado),
  }));

  return (
    <div>
      <Link
        href="/clientes"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Clientes
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {clientDisplayName(c)}
          </h1>
          <Badge variant={estadoVariant(c.estado)}>{c.estado}</Badge>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={`/clientes/${c.id}/editar`}>
                <Pencil className="size-4" /> Editar
              </Link>
            </Button>
          )}
          {canCreateOpp && (
            <Button asChild>
              <Link href={`/oportunidades/nuevo?clienteId=${c.id}`}>
                <Plus className="size-4" /> Nueva oportunidad
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr_340px]">
        {/* Izquierda: datos + contactos */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información básica</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              <Row label="Tipo" value={c.personType === "NATURAL" ? "Persona Natural" : "Persona Jurídica"} />
              <Row label="Documento" value={`${c.tipoDocumento ?? ""} ${c.numeroDocumento ?? ""}`.trim()} />
              <Row label="Email" value={c.email} />
              <Row label="Teléfono" value={c.telefono} />
              <Row label="Asesor" value={c.advisor?.name} />
              <Row label="Ciudad" value={c.ciudad} />
              <Row label="Canal" value={c.canal} />
              <Row label="Lista de precio" value={c.priceList?.name} />
              <Row label="Sector" value={c.sector?.name} />
              <Row label="SubSector" value={c.subSector?.name} />
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <ContactsPanel
                clientId={c.id}
                canManage={canManageContacts}
                contacts={c.contacts.map((ct) => ({
                  id: ct.id,
                  nombre: ct.nombre,
                  email: ct.email,
                  telefono: ct.telefono,
                  cargo: ct.cargo,
                  observacion: ct.observacion,
                }))}
              />
            </div>
          </Card>
        </div>

        {/* Centro: relaciones (tabs) + adjuntos */}
        <div className="space-y-6">
          <Card className="p-4">
            <TabsLite
              tabs={[
                {
                  id: "opp",
                  label: `Oportunidades (${opps.length})`,
                  content: (
                    <RelTable
                      rows={opps}
                      detalleHeader="Oportunidad"
                      extraHeader="Asesor"
                      emptyLabel="oportunidades"
                    />
                  ),
                },
                {
                  id: "quo",
                  label: `Cotizaciones (${quotes.length})`,
                  content: (
                    <RelTable
                      rows={quotes}
                      detalleHeader="Oportunidad"
                      extraHeader="Total"
                      emptyLabel="cotizaciones"
                    />
                  ),
                },
                {
                  id: "ord",
                  label: `Pedidos (${orders.length})`,
                  content: (
                    <RelTable
                      rows={orders}
                      detalleHeader="Oportunidad"
                      extraHeader="Total"
                      emptyLabel="pedidos"
                    />
                  ),
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
                clientId={c.id}
                tipos={tiposArchivo}
                canUpload={isStorageConfigured()}
                attachments={c.attachments.map((a) => ({
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

        {/* Derecha: saldo + registro de actividad + timeline */}
        <div className="space-y-6">
          <Card className="flex items-center gap-3 bg-primary p-4 text-primary-foreground">
            <Wallet className="size-8 opacity-80" />
            <div>
              <p className="text-sm text-primary-foreground/80">Saldo Cartera</p>
              <p className="tabular text-xl font-bold">
                {formatMoney(Number(c.saldoCartera ?? 0))}
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registro de actividad</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              <RegisterActivity entityType="CLIENT" entityId={c.id} acciones={acciones} />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actividad</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              <Timeline
                items={c.activities.map((a) => ({
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
