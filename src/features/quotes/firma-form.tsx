"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eraser, FileUp, PenLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { signQuote, rejectQuote } from "./signature-actions";

const MAX_SIDE = 1000; // lado máximo (px) de la imagen de firma exportada

/** Dibuja `source` sobre fondo blanco, reducido a MAX_SIDE, y devuelve un PNG data-URL. */
function toSignaturePng(
  source: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number
): string {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

async function imageFileToPng(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("No se pudo leer la imagen."));
      el.src = url;
    });
    return toSignaturePng(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Renderiza la primera página del PDF a un PNG (pdfjs se carga solo si hace falta). */
async function pdfFileToPng(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  try {
    const doc = await task.promise;
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({
      scale: Math.min(2, MAX_SIDE / Math.max(base.width, base.height)),
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    return toSignaturePng(canvas, canvas.width, canvas.height);
  } finally {
    await task.destroy();
  }
}

/** Tablero de dibujo de firma (mouse, dedo o lápiz vía pointer events). */
function SignaturePad({
  onChange,
}: {
  onChange: (hasInk: boolean) => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const drawing = React.useRef(false);
  const hasInk = React.useRef(false);

  // Ajusta el tamaño interno del canvas al contenedor (con densidad de pantalla).
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      // Preserva el trazo actual al redimensionar.
      const prev = document.createElement("canvas");
      prev.width = canvas.width;
      prev.height = canvas.height;
      prev.getContext("2d")!.drawImage(canvas, 0, 0);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1a1a1a";
      if (prev.width > 0 && prev.height > 0) {
        ctx.drawImage(prev, 0, 0, rect.width, rect.height);
      }
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(canvas);
    return () => obs.disconnect();
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = e.currentTarget.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Punto inicial visible aunque solo se toque sin arrastrar.
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    if (!hasInk.current) {
      hasInk.current = true;
      onChange(true);
    }
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  function up() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    hasInk.current = false;
    onChange(false);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          data-signature-pad
          className="h-40 w-full cursor-crosshair rounded-md border bg-white"
          style={{ touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs text-muted-foreground">
          Firma aquí con el dedo o el mouse
        </span>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={clear}>
        <Eraser className="size-4" /> Limpiar
      </Button>
    </div>
  );
}

export function FirmaForm({ token }: { token: string }) {
  const router = useRouter();
  const [nombre, setNombre] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [modo, setModo] = React.useState<"dibujar" | "archivo">("dibujar");
  const [hasInk, setHasInk] = React.useState(false);
  const [archivoPng, setArchivoPng] = React.useState<string | null>(null);
  const [archivoNombre, setArchivoNombre] = React.useState<string | null>(null);
  const [procesando, setProcesando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const padWrapRef = React.useRef<HTMLDivElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setProcesando(true);
    try {
      const esPdf =
        file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      const esImagen = file.type.startsWith("image/");
      if (!esPdf && !esImagen) {
        throw new Error("Adjunta una imagen (PNG/JPG) o un PDF.");
      }
      const png = esPdf ? await pdfFileToPng(file) : await imageFileToPng(file);
      setArchivoPng(png);
      setArchivoNombre(file.name);
    } catch (err) {
      const msg =
        err instanceof Error && err.message.startsWith("Adjunta")
          ? err.message
          : "No se pudo procesar el archivo. Intenta con otro.";
      setError(msg);
      toast.error(msg);
    } finally {
      setProcesando(false);
    }
  }

  function firmar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let firmaImagen: string | null = null;
    if (modo === "dibujar") {
      const canvas = padWrapRef.current?.querySelector<HTMLCanvasElement>(
        "canvas[data-signature-pad]"
      );
      if (!hasInk || !canvas) {
        setError("Dibuja tu firma en el tablero antes de continuar.");
        return;
      }
      firmaImagen = toSignaturePng(canvas, canvas.width, canvas.height);
    } else {
      if (!archivoPng) {
        setError("Adjunta el archivo con tu firma antes de continuar.");
        return;
      }
      firmaImagen = archivoPng;
    }

    start(async () => {
      const res = await signQuote(token, nombre, email, firmaImagen!);
      if (res.ok) {
        toast.success("Cotización firmada");
        router.refresh();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  function rechazar() {
    confirmDialog(
      "¿Rechazar la cotización?",
      () => {
        setError(null);
        start(async () => {
          const res = await rejectQuote(token);
          if (res.ok) {
            toast.success("Cotización rechazada");
            router.refresh();
          } else {
            setError(res.error);
            toast.error(res.error);
          }
        });
      },
      { actionLabel: "Rechazar" }
    );
  }

  return (
    <form onSubmit={firmar} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Ingresa tus datos y tu firma para aprobar esta cotización.
      </p>
      <Input
        placeholder="Tu nombre *"
        required
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <Input
        type="email"
        placeholder="Tu email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(
          [
            { id: "dibujar", label: "Dibujar firma", icon: PenLine },
            { id: "archivo", label: "Subir archivo", icon: FileUp },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setModo(t.id)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              modo === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="size-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* El tablero queda montado (oculto) para no perder el trazo al cambiar de modo. */}
      <div ref={padWrapRef} className={modo === "dibujar" ? "" : "hidden"}>
        <SignaturePad onChange={setHasInk} />
      </div>

      <div className={modo === "archivo" ? "space-y-2" : "hidden"}>
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed p-6 text-sm text-muted-foreground transition-colors hover:bg-muted/50",
            procesando && "pointer-events-none opacity-60"
          )}
        >
          <FileUp className="size-5" />
          <span>
            {procesando
              ? "Procesando archivo…"
              : "Selecciona una imagen (PNG/JPG) o un PDF con tu firma"}
          </span>
          <input
            type="file"
            accept="image/*,application/pdf,.pdf"
            className="hidden"
            onChange={onFile}
          />
        </label>
        {archivoPng && (
          <div className="rounded-md border p-2">
            <p className="mb-1 truncate text-xs text-muted-foreground">
              {archivoNombre}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={archivoPng}
              alt="Vista previa de la firma"
              className="mx-auto max-h-40 rounded bg-white object-contain"
            />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || procesando}>
          Aprobar y firmar
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={rechazar}
        >
          Rechazar
        </Button>
      </div>
    </form>
  );
}
