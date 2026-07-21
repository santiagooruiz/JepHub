"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Paperclip, ExternalLink, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { saveSpecialFile, deleteSpecialFile } from "./actions";

export type SpecialFileItem = {
  id: string;
  tipoArchivo: string | null;
  observaciones: string | null;
  url: string;
  createdAt: string;
};

export function SpecialFilesPanel({
  specialDesignId,
  files,
  canEdit,
  /** false cuando el storage (MinIO) no está configurado: solo registro de URL. */
  canUpload = true,
}: {
  specialDesignId: string;
  files: SpecialFileItem[];
  canEdit: boolean;
  canUpload?: boolean;
}) {
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = React.useState("");
  const [obs, setObs] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function reset() {
    setTipo("");
    setObs("");
    setUrl("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file && !url.trim()) {
      setError("Selecciona un archivo o escribe una URL.");
      return;
    }
    start(async () => {
      if (file) {
        // Subida binaria vía /api/files (multipart).
        const fd = new FormData();
        fd.set("file", file);
        fd.set("specialDesignId", specialDesignId);
        fd.set("tipoArchivo", tipo);
        fd.set("observaciones", obs);
        try {
          const res = await fetch("/api/files", { method: "POST", body: fd });
          const data = (await res.json()) as { error?: string };
          if (!res.ok) {
            const msg = data.error ?? "No se pudo subir el archivo.";
            setError(msg);
            toast.error(msg);
            return;
          }
        } catch {
          setError("No se pudo subir el archivo.");
          toast.error("No se pudo subir el archivo.");
          return;
        }
        toast.success("Archivo subido");
      } else {
        const res = await saveSpecialFile({
          specialDesignId,
          tipoArchivo: tipo,
          observaciones: obs,
          url,
        });
        if (!res.ok) {
          setError(res.error);
          toast.error(res.error);
          return;
        }
        toast.success("Archivo registrado");
      }
      reset();
      router.refresh();
    });
  }

  function remove(id: string) {
    confirmDialog("¿Eliminar archivo?", () =>
      start(async () => {
        const res = await deleteSpecialFile(id);
        if (res.ok) toast.success("Archivo eliminado");
        else toast.error(res.error);
        router.refresh();
      })
    );
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input placeholder="Tipo (ej. Render 3D)" value={tipo} onChange={(e) => setTipo(e.target.value)} />
          <Input placeholder="Observaciones" value={obs} onChange={(e) => setObs(e.target.value)} />
          {canUpload && (
            <input
              ref={fileRef}
              type="file"
              aria-label="Archivo"
              className="sm:col-span-2 h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-0.5 file:text-xs file:font-medium file:text-foreground"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          )}
          <Input
            className="sm:col-span-2"
            placeholder={canUpload ? "…o registra una URL" : "URL o nombre del archivo *"}
            value={url}
            disabled={Boolean(file)}
            onChange={(e) => setUrl(e.target.value)}
          />
          {error && <p className="sm:col-span-2 text-sm text-[hsl(var(--destructive))]">{error}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : file ? (
                <Upload className="size-4" />
              ) : (
                <Paperclip className="size-4" />
              )}
              {file ? "Subir archivo" : "Registrar archivo"}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {files.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-medium">
                <Paperclip className="size-4 text-muted-foreground" />
                <span className="truncate">{a.tipoArchivo || "Archivo"}</span>
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {a.observaciones ? `${a.observaciones} · ` : ""}
                {a.createdAt}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                aria-label="Abrir"
              >
                <ExternalLink className="size-4" />
              </a>
              {canEdit && (
                <button
                  onClick={() => remove(a.id)}
                  className="inline-flex size-8 items-center justify-center rounded-md text-[hsl(var(--destructive))] hover:bg-destructive/10"
                  aria-label="Eliminar archivo"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {!files.length && <p className="text-sm text-muted-foreground">Sin archivos.</p>}
      </div>

      {!canUpload && (
        <p className="text-xs text-muted-foreground">
          El almacenamiento de archivos no está configurado: por ahora solo se
          puede registrar la URL del archivo.
        </p>
      )}
    </div>
  );
}
