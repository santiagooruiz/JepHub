"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Paperclip, ExternalLink, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { saveAttachment, deleteAttachment, ensureClientAnchor } from "./actions";

export type AttachmentItem = {
  id: string;
  tipoArchivo: string | null;
  observaciones: string | null;
  url: string;
  nombre?: string | null;
  size?: number | null;
  createdAt: string;
};

const selectCls =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentsPanel({
  clientId,
  opportunityId,
  attachments,
  anchor,
  tipos,
  canUpload = true,
}: {
  clientId?: string;
  opportunityId?: string;
  attachments: AttachmentItem[];
  /** Cliente del ERP: crea/resuelve el ancla por NIT antes de guardar. */
  anchor?: { nit: string; nombre: string; esEmpresa: boolean };
  /** Catálogo "Tipo Archivo" (parámetro `file_types`); sin él, texto libre. */
  tipos?: string[];
  /** false cuando el storage (MinIO) no está configurado: solo registro de URL. */
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

  /** Resuelve el clientId (creando el ancla del cliente ERP si aplica). */
  async function resolveClientId(): Promise<string | undefined | null> {
    if (!anchor) return clientId;
    const a = await ensureClientAnchor({
      nit: anchor.nit,
      nombre: anchor.nombre,
      esEmpresa: anchor.esEmpresa,
    });
    if (!a.ok) {
      setError(a.error);
      toast.error(a.error);
      return null;
    }
    return a.clientId ?? null;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file && !url.trim()) {
      setError("Selecciona un archivo o escribe una URL.");
      return;
    }
    start(async () => {
      const cId = await resolveClientId();
      if (cId === null) return; // error ya notificado

      if (file) {
        // Subida binaria vía /api/files (multipart).
        const fd = new FormData();
        fd.set("file", file);
        if (cId) fd.set("clientId", cId);
        if (opportunityId) fd.set("opportunityId", opportunityId);
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
        // Solo registro de URL (sin binario).
        const res = await saveAttachment({
          clientId: cId,
          opportunityId,
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
    confirmDialog("¿Eliminar adjunto?", () =>
      start(async () => {
        const res = await deleteAttachment(id);
        if (res.ok) {
          toast.success("Adjunto eliminado");
          router.refresh();
        } else {
          toast.error(res.error);
        }
      })
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {tipos?.length ? (
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className={selectCls}
            aria-label="Tipo de archivo"
          >
            <option value="">Tipo de archivo…</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        ) : (
          <Input
            placeholder="Tipo (ej. Orden de compra)"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          />
        )}
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
          placeholder={canUpload ? "…o registra una URL (Drive, etc.)" : "URL del archivo *"}
          value={url}
          disabled={Boolean(file)}
          onChange={(e) => setUrl(e.target.value)}
        />
        {error && (
          <p className="sm:col-span-2 text-sm text-[hsl(var(--destructive))]">{error}</p>
        )}
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

      <div className="space-y-2">
        {attachments.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-medium">
                <Paperclip className="size-4 text-muted-foreground" />
                <span className="truncate">{a.nombre || a.tipoArchivo || "Archivo"}</span>
                {a.nombre && a.tipoArchivo && (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                    {a.tipoArchivo}
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {a.observaciones ? `${a.observaciones} · ` : ""}
                {a.size ? `${formatSize(a.size)} · ` : ""}
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
              <button
                onClick={() => remove(a.id)}
                className="inline-flex size-8 items-center justify-center rounded-md text-[hsl(var(--destructive))] hover:bg-destructive/10"
                aria-label="Eliminar adjunto"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
        {!attachments.length && (
          <p className="text-sm text-muted-foreground">Sin archivos.</p>
        )}
      </div>
    </div>
  );
}
