"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  BadgeCheck,
  ChevronDown,
  ImagePlus,
  MessageSquare,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { updateDesignPlanning, updateDesignState, finalApproval } from "./actions";

const itemCls =
  "flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm hover:bg-accent";

/**
 * Menú de acciones rápidas del panel de detalle (▼ del CRM original):
 * Subir Archivo · Enviar Mensaje · Rechazar item · Imagen del producto.
 */
export function DrawerMenu({
  id,
  selfHref,
  imagen,
}: {
  id: string;
  /** URL del propio drawer (?producto=…), para saltar a un tab concreto. */
  selfHref: string;
  imagen: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editImg, setEditImg] = React.useState(false);
  const [img, setImg] = React.useState(imagen ?? "");
  const [pending, start] = React.useTransition();

  function saveImagen() {
    start(async () => {
      const res = await updateDesignPlanning({ id, imagen: img.trim() || null });
      if (res.ok) {
        toast.success("Imagen del producto guardada");
        setEditImg(false);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function rechazar() {
    confirmDialog(
      '¿Rechazar este producto? Pasará al estado "Rechazados".',
      () =>
        start(async () => {
          const res = await updateDesignState(id, "Rechazados");
          if (res.ok) toast.success("Producto rechazado");
          else toast.error(res.error);
          setOpen(false);
          router.refresh();
        }),
      { actionLabel: "Rechazar" }
    );
  }

  function aprobacionFinal() {
    confirmDialog(
      '¿Realizar la aprobación final? El producto pasará a "Finalizados".',
      () =>
        start(async () => {
          const res = await finalApproval(id);
          if (res.ok) toast.success("Aprobación final realizada");
          else toast.error(res.error);
          setOpen(false);
          router.refresh();
        }),
      { actionLabel: "Aprobar", destructive: false }
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20"
        aria-label="Acciones"
        aria-expanded={open}
      >
        <ChevronDown className="size-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border bg-popover p-1 shadow-md">
            <button className={itemCls} disabled={pending} onClick={aprobacionFinal}>
              <BadgeCheck className="size-4 text-[hsl(var(--success))]" /> Aprobación final
            </button>
            <Link href={`${selfHref}&tab=archivos`} scroll={false} className={itemCls} onClick={() => setOpen(false)}>
              <Paperclip className="size-4 text-muted-foreground" /> Subir archivo
            </Link>
            <Link href={`${selfHref}&tab=mensajes`} scroll={false} className={itemCls} onClick={() => setOpen(false)}>
              <MessageSquare className="size-4 text-muted-foreground" /> Enviar mensaje
            </Link>
            <button className={itemCls} onClick={() => setEditImg((v) => !v)}>
              <ImagePlus className="size-4 text-muted-foreground" /> Imagen del producto
            </button>
            {editImg && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveImagen();
                }}
                className="flex items-center gap-1 p-1.5"
              >
                <Input
                  autoFocus
                  placeholder="URL de la imagen"
                  value={img}
                  onChange={(e) => setImg(e.target.value)}
                  className="h-8"
                />
                <Button type="submit" size="sm" disabled={pending}>
                  Guardar
                </Button>
              </form>
            )}
            <button
              className={`${itemCls} text-[hsl(var(--destructive))] hover:bg-destructive/10`}
              disabled={pending}
              onClick={rechazar}
            >
              <Ban className="size-4" /> Rechazar item
            </button>
          </div>
        </>
      )}
    </div>
  );
}
