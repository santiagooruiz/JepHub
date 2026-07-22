"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, PencilRuler, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveDesignFile } from "./actions";

/** Checklist de datos de entrada para que diseño atienda la solicitud. */
function SolicitudChecklist() {
  return (
    <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 p-2.5 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">Para que diseño atienda la solicitud:</p>
      <p className="mt-1">
        Formatos aceptados: DWG (AutoCAD, si el cliente lo suministra), Sketchup, PDF, JPG
        (referencias/fotos del espacio), PowerPoint/Word.
      </p>
      <p className="mt-1">
        La descripción debe incluir medidas, acabados y necesidades claras: tipologías (puestos
        de trabajo, conectividad), mesas de juntas, muebles de almacenamiento, alturas piso-techo,
        requerimientos del cliente y medidas del levantamiento.
      </p>
    </div>
  );
}

/**
 * Diálogo "Solicitar planos/cambios" (y "Solicitar cambio"): exige adjuntar
 * el/los archivo(s) de Levantamiento y escribir la descripción ANTES de
 * crear la solicitud, para que diseño nunca reciba una solicitud sin esa
 * información (el problema que motivó este componente).
 */
export function SolicitarPlanosDialog({
  trigger,
  dialogTitle,
  canUpload,
  onCreate,
  onDone,
}: {
  trigger: React.ReactNode;
  dialogTitle: string;
  /** false cuando el storage (MinIO) no está configurado: solo registro de URL. */
  canUpload: boolean;
  onCreate: (descripcion: string) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;
  onDone: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [descripcion, setDescripcion] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const canSubmit =
    descripcion.trim().length > 0 && (canUpload ? files.length > 0 : url.trim().length > 0);

  function reset() {
    setDescripcion("");
    setFiles([]);
    setUrl("");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    setError(null);
    if (!canSubmit) {
      setError("Adjunta el levantamiento y escribe la descripción antes de enviar.");
      return;
    }
    start(async () => {
      const res = await onCreate(descripcion.trim());
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }

      if (canUpload) {
        for (const file of files) {
          const fd = new FormData();
          fd.set("file", file);
          fd.set("designRequestId", res.id);
          fd.set("tipoArchivo", "Levantamiento");
          try {
            const up = await fetch("/api/files", { method: "POST", body: fd });
            if (!up.ok) {
              const data = (await up.json().catch(() => ({}))) as { error?: string };
              toast.error(data.error ?? `No se pudo subir ${file.name}.`);
            }
          } catch {
            toast.error(`No se pudo subir ${file.name}.`);
          }
        }
      } else {
        const up = await saveDesignFile({
          designRequestId: res.id,
          tipoArchivo: "Levantamiento",
          url: url.trim(),
        });
        if (!up.ok) toast.error(up.error);
      }

      toast.success("Solicitud enviada a diseño");
      setOpen(false);
      reset();
      onDone(res.id);
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-5 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="flex items-center gap-2 text-sm font-semibold">
              <PencilRuler className="size-4" /> {dialogTitle}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-3">
            <SolicitudChecklist />

            <div>
              <label className="mb-1 block text-xs font-medium">Descripción</label>
              <textarea
                autoFocus
                rows={4}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe medidas, acabados, tipologías y demás requerimientos…"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">Levantamiento</label>
              {canUpload ? (
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  aria-label="Archivos de levantamiento"
                  className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-0.5 file:text-xs file:font-medium file:text-foreground"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                />
              ) : (
                <Input
                  placeholder="URL o nombre del archivo"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              )}
            </div>

            {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button size="sm" disabled={pending || !canSubmit} onClick={submit}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Enviar solicitud
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
