import { Badge } from "@/components/ui/badge";
import { isStorageConfigured } from "@/lib/storage";
import { listDesignRequestVersionsForQuote } from "./queries";
import { BACKLOG_ESTADO_FINAL, backlogEstadoVariant } from "./types";
import { DesignFilesPanel } from "./design-files-panel";
import { RequestDesignButton } from "./request-design-button";

/**
 * Panel "Solicitudes de plano comercial" embebido en la cotización: historial
 * de versiones (como el CRM original) con Levantamiento (archivos del
 * asesor) y Planos Comerciales (archivos de diseño) por versión.
 */
export async function DesignRequestsPanel({
  companyId,
  quoteId,
  canCreate,
  canEdit,
}: {
  companyId: string;
  quoteId: string;
  /** Puede solicitar planos/cambios y adjuntar Levantamiento. */
  canCreate: boolean;
  /** Puede subir/aprobar Planos Comerciales (rol de diseño). */
  canEdit: boolean;
}) {
  const versiones = await listDesignRequestVersionsForQuote(companyId, quoteId);
  const canUpload = isStorageConfigured();
  const ultima = versiones[versiones.length - 1] ?? null;

  const editableCategories = [
    ...(canCreate ? ["Levantamiento"] : []),
    ...(canEdit ? ["Planos Comerciales"] : []),
  ];

  return (
    <div className="space-y-3">
      <RequestDesignButton
        quoteId={quoteId}
        designRequestId={ultima?.id ?? null}
        designRequestEstado={ultima?.estado ?? null}
        designRequestVersion={ultima?.version ?? 1}
        canUpload={canUpload}
      />
      {versiones.map((v, i) => (
        <details key={v.id} open={i === versiones.length - 1} className="rounded-md border">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2">
            <span className="text-sm font-medium">Versión {v.version}</span>
            <Badge variant={backlogEstadoVariant(v.estado)}>
              {v.estado === BACKLOG_ESTADO_FINAL ? "COMPLETADO" : v.estado}
            </Badge>
          </summary>
          <div className="space-y-3 border-t px-3 pb-3 pt-3 text-sm">
            <p>
              <span className="font-medium">Fecha solicitud:</span> {v.fechaSolicitud}
            </p>
            <p>
              <span className="font-medium">Descripción:</span>{" "}
              <span className="text-muted-foreground">{v.descripcion || "—"}</span>
            </p>
            <p>
              <span className="font-medium">Diseñador:</span>{" "}
              <span className="text-muted-foreground">{v.disenador || "—"}</span>
            </p>
            <DesignFilesPanel
              designRequestId={v.id}
              categories={["Levantamiento", "Planos Comerciales"]}
              editableCategories={editableCategories}
              canUpload={canUpload}
              files={v.files}
            />
          </div>
        </details>
      ))}
    </div>
  );
}
