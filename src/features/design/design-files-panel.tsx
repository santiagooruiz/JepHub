"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Plus, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DESIGN_FILE_CATEGORIES } from "./types";
import { saveDesignFile, deleteDesignFile, setDesignFileEstado } from "./actions";

/**
 * Categorías cuyos archivos pasan por aprobación/validación: la ficha técnica
 * (aprobación FT) y los entregables (validación en "Pendiente Validación").
 */
const CATEGORIAS_APROBABLES = [
  "Ficha Técnica / Ficha de ajuste",
  "Despiece",
  "Armado general",
  "Planos Técnicos",
];

export type DesignFileItem = {
  id: string;
  tipoArchivo: string | null;
  observaciones: string | null;
  url: string;
  createdAt: string;
  // Aprobación de ficha técnica y borrado suave
  estado: string | null; // APROBADA | RECHAZADA
  aprobadoPor: string | null;
  fechaAprobacion: string | null;
  firma: string | null;
  borrado: boolean;
};

const fileName = (url: string) => url.split("/").pop() || url;

/**
 * Tab "Archivos" del backlog: checklist de categorías fijas (Ficha Comercial,
 * Ficha Técnica, Despiece…) con los archivos registrados en cada una, como en
 * el CRM original.
 */
export function DesignFilesPanel({
  designRequestId,
  files,
  canEdit,
}: {
  designRequestId: string;
  files: DesignFileItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState<string | null>(null);
  const [url, setUrl] = React.useState("");
  const [obs, setObs] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  const categorias = DESIGN_FILE_CATEGORIES as readonly string[];
  const otros = files.filter((f) => !categorias.includes(f.tipoArchivo ?? ""));

  function submit(categoria: string) {
    setError(null);
    start(async () => {
      const res = await saveDesignFile({
        designRequestId,
        tipoArchivo: categoria,
        observaciones: obs,
        url,
      });
      if (res.ok) {
        toast.success("Archivo registrado");
        setUrl("");
        setObs("");
        setAdding(null);
        router.refresh();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  function remove(id: string) {
    confirmDialog("¿Eliminar archivo? Quedará marcado como [BORRADA].", () =>
      start(async () => {
        const res = await deleteDesignFile(id);
        if (res.ok) toast.success("Archivo eliminado");
        else toast.error(res.error);
        router.refresh();
      })
    );
  }

  function aprobar(id: string, estado: "APROBADA" | "RECHAZADA") {
    start(async () => {
      const res = await setDesignFileEstado(id, estado);
      if (res.ok)
        toast.success(
          estado === "APROBADA" ? "Archivo aprobado" : "Archivo rechazado"
        );
      else toast.error(res.error);
      router.refresh();
    });
  }

  function FileChip({ f }: { f: DesignFileItem }) {
    const aprobable =
      canEdit &&
      !f.borrado &&
      CATEGORIAS_APROBABLES.includes(f.tipoArchivo ?? "");
    return (
      <div className={cn("rounded-md border px-3 py-1.5 text-sm", f.borrado && "opacity-70")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2">
            <a
              href={f.url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "inline-flex min-w-0 items-center gap-1 text-primary hover:underline",
                f.borrado && "line-through"
              )}
            >
              <span className="truncate">{fileName(f.url)}</span>
              <ExternalLink className="size-3.5 shrink-0" />
            </a>
            {f.borrado && (
              <span className="text-xs font-semibold text-muted-foreground">[BORRADA]</span>
            )}
            {!f.borrado && f.estado === "RECHAZADA" && (
              <span className="text-xs font-semibold text-[hsl(var(--destructive))]">
                [RECHAZADA]
              </span>
            )}
            {!f.borrado && f.estado === "APROBADA" && (
              <span className="text-xs font-semibold text-[hsl(var(--success))]">
                [APROBADA]
              </span>
            )}
          </div>
          {!f.borrado && (
            <div className="flex shrink-0 items-center gap-0.5">
              {aprobable && f.estado !== "APROBADA" && (
                <button
                  onClick={() => aprobar(f.id, "APROBADA")}
                  disabled={pending}
                  className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-[hsl(var(--success))]"
                  aria-label="Aprobar ficha técnica"
                  title="Aprobar"
                >
                  <ThumbsUp className="size-3.5" />
                </button>
              )}
              {aprobable && f.estado !== "RECHAZADA" && (
                <button
                  onClick={() => aprobar(f.id, "RECHAZADA")}
                  disabled={pending}
                  className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-[hsl(var(--destructive))]"
                  aria-label="Rechazar ficha técnica"
                  title="Rechazar"
                >
                  <ThumbsDown className="size-3.5" />
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => remove(f.id)}
                  disabled={pending}
                  className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-[hsl(var(--destructive))]"
                  aria-label={`Eliminar ${fileName(f.url)}`}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
        {f.observaciones && (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Observaciones:</span>{" "}
            {f.observaciones}
          </p>
        )}
        {f.aprobadoPor && !f.borrado && (
          <div className="mt-2 space-y-0.5 border-t pt-2 text-xs">
            <p>
              <span className="font-semibold">
                {f.estado === "RECHAZADA" ? "Rechazado por:" : "Aprobado por:"}
              </span>{" "}
              {f.aprobadoPor}
            </p>
            {f.fechaAprobacion && (
              <p>
                <span className="font-semibold">Fecha de aprobación:</span>{" "}
                {f.fechaAprobacion}
              </p>
            )}
            {f.firma && (
              <p className="flex items-center gap-2">
                <span className="font-semibold">Firma:</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.firma} alt="Firma" className="h-10 object-contain" />
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  function Categoria({
    nombre,
    items,
    addable = true,
  }: {
    nombre: string;
    items: DesignFileItem[];
    addable?: boolean;
  }) {
    const done = items.some((f) => !f.borrado);
    const abierto = adding === nombre;
    return (
      <div className="space-y-2 border-b pb-3 last:border-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex size-4 items-center justify-center rounded-sm border",
              done
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background"
            )}
            aria-hidden
          >
            {done && <Check className="size-3" />}
          </span>
          <span className={cn("text-sm", done ? "font-medium" : "text-muted-foreground")}>
            {nombre}
          </span>
          {canEdit && addable && !abierto && (
            <button
              onClick={() => {
                setAdding(nombre);
                setUrl("");
                setObs("");
                setError(null);
              }}
              className="ml-auto inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              aria-label={`Agregar archivo a ${nombre}`}
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>

        {items.map((f) => (
          <FileChip key={f.id} f={f} />
        ))}

        {abierto && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(nombre);
            }}
            className="space-y-2"
          >
            <Input
              autoFocus
              placeholder="URL o nombre del archivo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Input
              placeholder="Observaciones (opcional)"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={pending || !url.trim()}>
                Guardar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setAdding(null)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
      {DESIGN_FILE_CATEGORIES.map((cat) => (
        <Categoria
          key={cat}
          nombre={cat}
          items={files.filter((f) => f.tipoArchivo === cat)}
        />
      ))}
      {otros.length > 0 && <Categoria nombre="Otros" items={otros} addable={false} />}
      <p className="text-xs text-muted-foreground">
        Nota: por ahora se registran metadatos/URL. La subida binaria a
        almacenamiento (R2/MinIO) se habilita en fase de infraestructura.
      </p>
    </div>
  );
}
