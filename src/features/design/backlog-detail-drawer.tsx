import type { ReactNode } from "react";
import Link from "next/link";
import { ImageIcon, SquareArrowOutUpRight, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TabsLite } from "@/components/ui/tabs-lite";
import { Timeline } from "@/features/activity/timeline";
import { clientDisplayName } from "@/features/clients/queries";
import { getDesignRequestDetail } from "./queries";
import { backlogEstadoVariant, formatMoney } from "./types";
import { DetailDrawer } from "./detail-drawer";
import { DesignFilesPanel } from "./design-files-panel";
import { DesignPrecioForm } from "./design-precio-form";
import { DrawerMenu } from "./drawer-menu";
import { MessagesPanel } from "./messages-panel";

const dateTime = (d: Date) => d.toLocaleString("es-CO");

function Dato({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b py-2.5 text-sm last:border-0">
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">{value || "—"}</span>
    </div>
  );
}

/**
 * Contenido del 👁️ del Backlog Diseño: ficha con imagen y tabs
 * Información / Archivos / Mensajes / Histórico (parity con el CRM original).
 */
export async function BacklogDetailDrawer({
  companyId,
  id,
  closeHref,
  selfHref,
  tab,
  canEdit,
  canUpload = true,
}: {
  companyId: string;
  id: string;
  closeHref: string;
  /** URL de este mismo drawer (para el menú de acciones rápidas). */
  selfHref: string;
  /** Tab inicial (info | archivos | mensajes | historico). */
  tab?: string;
  canEdit: boolean;
  /** false cuando el storage (MinIO) no está configurado: solo registro de URL. */
  canUpload?: boolean;
}) {
  const dr = await getDesignRequestDetail(companyId, id);
  if (!dr) return null;

  const asesor = dr.order?.advisor?.name ?? dr.quote?.registeredBy?.name ?? "";
  // Origen de la solicitud: pedido (ficha técnica), cotización o interno.
  const origen = dr.order
    ? {
        href: `/pedidos/${dr.order.id}`,
        label: `Pedido #${dr.order.numero}`,
        estado: dr.order.estado,
        client: dr.order.client,
      }
    : dr.quote
      ? {
          href: `/cotizaciones/${dr.quote.id}`,
          label: `Cotización N° ${dr.quote.numero}`,
          estado: dr.quote.estado,
          client: dr.quote.client,
        }
      : null;
  const secciones = [
    { label: "DATOS DE ENTRADA", text: dr.datosEntrada },
    { label: "REQUISITOS TÉCNICOS", text: dr.requisitosTecnicos },
    { label: "REQUISITOS FUNCIONALES Y DESEMPEÑO", text: dr.requisitosFuncionales },
    { label: "POSIBLES ASPECTOS A FALLAR", text: dr.posiblesFallos },
    { label: "REQUISITOS LEGALES Y REGLAMENTARIOS", text: dr.requisitosLegales },
    { label: "INFORMACIÓN DE DISEÑOS PREVIOS (REFERENTES)", text: dr.disenosPrevios },
  ].filter((s) => s.text);

  const tabs = [
    {
      id: "info",
      label: "Información",
      content: (
        <div>
          <Dato
            label="Producto"
            value={dr.special ? dr.special.codigo : `Diseño N° ${dr.numero}`}
          />
          {(dr.version > 1 || dr.previousRequest || dr.nextRequest) && (
            <Dato
              label="Versión"
              value={
                <span className="space-y-1">
                  <span className="block">{dr.version}</span>
                  {dr.previousRequest && (
                    <Link
                      href={`/backlog/${dr.previousRequest.id}`}
                      className="block text-primary hover:underline"
                    >
                      Basada en Diseño N° {dr.previousRequest.numero} (v{dr.previousRequest.version})
                    </Link>
                  )}
                  {dr.nextRequest && (
                    <Link
                      href={`/backlog/${dr.nextRequest.id}`}
                      className="block text-primary hover:underline"
                    >
                      Tiene una versión más reciente: Diseño N° {dr.nextRequest.numero} (
                      {dr.nextRequest.estado})
                    </Link>
                  )}
                </span>
              }
            />
          )}
          {origen && (
            <Dato
              label="Cliente"
              value={origen.client ? clientDisplayName(origen.client) : "—"}
            />
          )}
          <Dato label="Asesor" value={asesor} />
          <Dato label="Diseñador" value={dr.designer?.name ?? ""} />
          <Dato label="Fecha de creación" value={dateTime(dr.createdAt)} />
          <Dato
            label="N° pedido (Ofimática)"
            value={dr.nPedidoOfimatica ?? dr.order?.erpSync?.nPedidoOfimatica ?? ""}
          />
          <Dato
            label="Precio estimado venta Público"
            value={
              dr.precioVentaPublico != null
                ? formatMoney(Number(dr.precioVentaPublico))
                : ""
            }
          />
          <Dato
            label="Precio estimado venta Dto"
            value={
              dr.precioVentaDto != null ? formatMoney(Number(dr.precioVentaDto)) : ""
            }
          />
          <Dato label="Cant. requerida" value={dr.cantRequerida ?? ""} />
          <Dato
            label="Descripción"
            value={
              secciones.length ? (
                <span className="space-y-3">
                  {secciones.map((s) => (
                    <span key={s.label} className="block">
                      <span className="block text-xs font-semibold text-foreground">
                        {s.label}:
                      </span>
                      <span className="whitespace-pre-wrap">{s.text}</span>
                    </span>
                  ))}
                </span>
              ) : (
                dr.descripcion
              )
            }
          />
          {canEdit && (
            <DesignPrecioForm
              id={dr.id}
              values={{
                precioVentaPublico:
                  dr.precioVentaPublico != null ? String(dr.precioVentaPublico) : "",
                precioVentaDto:
                  dr.precioVentaDto != null ? String(dr.precioVentaDto) : "",
                cantRequerida:
                  dr.cantRequerida != null ? String(dr.cantRequerida) : "",
              }}
            />
          )}
        </div>
      ),
    },
    {
      id: "archivos",
      label: `Archivos (${dr.files.filter((f) => !f.deletedAt).length})`,
      content: (
        <DesignFilesPanel
          designRequestId={dr.id}
          editableCategories={canEdit ? ["*"] : []}
          canUpload={canUpload}
          files={dr.files.map((f) => ({
            id: f.id,
            tipoArchivo: f.tipoArchivo,
            observaciones: f.observaciones,
            url: f.url,
            nombre: f.nombre,
            createdAt: dateTime(f.createdAt),
            estado: f.estado,
            aprobadoPor: f.aprobadoPor,
            fechaAprobacion: f.fechaAprobacion ? dateTime(f.fechaAprobacion) : null,
            firma: f.firma,
            borrado: !!f.deletedAt,
          }))}
        />
      ),
    },
    {
      id: "mensajes",
      label: `Mensajes (${dr.messages.length})`,
      content: (
        <MessagesPanel
          target={{ designRequestId: dr.id }}
          messages={dr.messages.map((m) => ({
            id: m.id,
            body: m.body,
            userName: m.user?.name ?? null,
            createdAt: dateTime(m.createdAt),
          }))}
        />
      ),
    },
    {
      id: "historico",
      label: "Histórico",
      content: (
        <Timeline
          items={dr.activities.map((a) => ({
            id: a.id,
            accion: a.accion,
            observaciones: a.observaciones,
            fechaHora: a.fechaHora,
            userName: a.user?.name ?? null,
            auto: a.auto,
          }))}
        />
      ),
    },
  ];

  return (
    <DetailDrawer closeHref={closeHref}>
      <div className="flex items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          {origen ? (
            <>
              <p className="truncate font-semibold text-primary">
                {origen.client ? clientDisplayName(origen.client) : "—"}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <Link href={origen.href} className="text-xs font-semibold hover:underline">
                  {origen.label}
                </Link>
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {origen.estado}
                </span>
                <Badge variant={backlogEstadoVariant(dr.estado)}>{dr.estado}</Badge>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">INTERNO</Badge>
              <Badge variant={backlogEstadoVariant(dr.estado)}>{dr.estado}</Badge>
            </div>
          )}
          <Link
            href={`/backlog/${dr.id}`}
            className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Abrir gestión completa <SquareArrowOutUpRight className="size-3" />
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && <DrawerMenu id={dr.id} selfHref={selfHref} imagen={dr.imagen} />}
          <Link
            href={closeHref}
            scroll={false}
            className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" /> Salir
          </Link>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4 flex justify-center">
          {dr.imagen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dr.imagen}
              alt=""
              className="max-h-56 rounded-md object-contain"
            />
          ) : (
            <div className="flex h-32 w-48 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <ImageIcon className="size-8" />
            </div>
          )}
        </div>

        <TabsLite key={tab ?? "info"} defaultId={tab} tabs={tabs} />
      </div>
    </DetailDrawer>
  );
}
