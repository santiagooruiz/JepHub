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
import { estadoVariant } from "@/features/clients/types";
import { ContactsPanel } from "@/features/clients/contacts-panel";
import { AttachmentsPanel } from "@/features/clients/attachments-panel";
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

export default async function ClienteFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("view", "clients");
  const canEdit = user.ability.can("edit", "clients");
  const canManageContacts = user.ability.can("createcontact", "clients");
  const { id } = await params;

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
    },
  });
  if (!c) notFound();

  const param = await db.parameter.findUnique({
    where: { companyId_key: { companyId: user.companyId, key: "action_activities" } },
  });
  const acciones = Array.isArray(param?.value)
    ? (param!.value as { value?: string }[]).map((o) => o.value ?? "").filter(Boolean)
    : ["Llamada", "Visita", "Email", "Observación"];

  return (
    <div>
      <Link
        href="/clientes"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Clientes
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {clientDisplayName(c)}
          </h1>
          <Badge variant={estadoVariant(c.estado)}>{c.estado}</Badge>
        </div>
        {canEdit && (
          <Button asChild variant="outline">
            <Link href={`/clientes/${c.id}/editar`}>
              <Pencil className="size-4" /> Editar
            </Link>
          </Button>
        )}
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
                { id: "opp", label: "Oportunidades", content: <EmptyTab label="oportunidades" /> },
                { id: "quo", label: "Cotizaciones", content: <EmptyTab label="cotizaciones" /> },
                { id: "ord", label: "Pedidos", content: <EmptyTab label="pedidos" /> },
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
                attachments={c.attachments.map((a) => ({
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

        {/* Derecha: registro de actividad + timeline */}
        <div className="space-y-6">
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
