"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DESIGN_FILE_CATEGORIES } from "./types";
import { saveDesignFile, deleteDesignFile } from "./actions";

export type DesignFileItem = {
  id: string;
  tipoArchivo: string | null;
  observaciones: string | null;
  url: string;
  createdAt: string;
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
        setUrl("");
        setObs("");
        setAdding(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function remove(id: string) {
    if (!window.confirm("¿Eliminar archivo?")) return;
    start(async () => {
      await deleteDesignFile(id);
      router.refresh();
    });
  }

  function FileChip({ f }: { f: DesignFileItem }) {
    return (
      <div className="rounded-md border px-3 py-1.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <a
            href={f.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-w-0 items-center gap-1 text-primary hover:underline"
          >
            <span className="truncate">{fileName(f.url)}</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
          {canEdit && (
            <button
              onClick={() => remove(f.id)}
              disabled={pending}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-[hsl(var(--destructive))]"
              aria-label={`Eliminar ${fileName(f.url)}`}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {f.observaciones && (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Observaciones:</span>{" "}
            {f.observaciones}
          </p>
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
    const done = items.length > 0;
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
