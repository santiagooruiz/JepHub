"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Paperclip, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveAttachment, deleteAttachment } from "./actions";

export type AttachmentItem = {
  id: string;
  tipoArchivo: string | null;
  observaciones: string | null;
  url: string;
  createdAt: string;
};

export function AttachmentsPanel({
  clientId,
  attachments,
}: {
  clientId: string;
  attachments: AttachmentItem[];
}) {
  const router = useRouter();
  const [tipo, setTipo] = React.useState("");
  const [obs, setObs] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveAttachment({
        clientId,
        tipoArchivo: tipo,
        observaciones: obs,
        url,
      });
      if (res.ok) {
        toast.success("Archivo registrado");
        setTipo("");
        setObs("");
        setUrl("");
        router.refresh();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }
  function remove(id: string) {
    if (!window.confirm("¿Eliminar adjunto?")) return;
    start(async () => {
      const res = await deleteAttachment(id);
      if (res.ok) {
        toast.success("Adjunto eliminado");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input placeholder="Tipo (ej. Orden de compra)" value={tipo} onChange={(e) => setTipo(e.target.value)} />
        <Input placeholder="Observaciones" value={obs} onChange={(e) => setObs(e.target.value)} />
        <Input
          className="sm:col-span-2"
          placeholder="URL o nombre del archivo *"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        {error && (
          <p className="sm:col-span-2 text-sm text-[hsl(var(--destructive))]">{error}</p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={pending}>
            <Paperclip className="size-4" /> Registrar archivo
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        {attachments.map((a) => (
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

      <p className="text-xs text-muted-foreground">
        Nota: por ahora se registran metadatos/URL. La subida binaria a
        almacenamiento (R2/MinIO) se habilita en fase de infraestructura.
      </p>
    </div>
  );
}
