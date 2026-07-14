"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  DollarSign,
  Pencil,
  PencilRuler,
  ThumbsDown,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { requestDesign } from "@/features/design/actions";
import { deleteOpportunity, updateOpportunityStage } from "./actions";

const itemCls =
  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

/**
 * Menú "Acciones" del detalle de oportunidad (paridad con el CRM original:
 * Editar · Registrar cotización · Solicitar planos · Ver cliente + Eliminar).
 */
export function OpportunityActionsMenu({
  id,
  numero,
  clientId,
  canEdit,
  canDelete,
  canCreateQuotes,
  canRequestDesign,
  designQuoteId,
  designRequestId,
  estado,
}: {
  id: string;
  numero: number;
  clientId: string;
  canEdit: boolean;
  canDelete: boolean;
  canCreateQuotes: boolean;
  canRequestDesign: boolean;
  estado: string;
  /** Cotización más reciente sin solicitud de diseño (para "Solicitar planos"). */
  designQuoteId: string | null;
  /** Solicitud de diseño ya existente en alguna cotización ("Ver en backlog"). */
  designRequestId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function solicitarPlanos() {
    if (!designQuoteId) return;
    setOpen(false);
    start(async () => {
      const res = await requestDesign(designQuoteId);
      if (res.ok) {
        toast.success("Solicitud de diseño creada");
        router.push(`/backlog/${res.id}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  function marcarPerdida() {
    setOpen(false);
    confirmDialog(`¿Marcar la oportunidad N° ${numero} como perdida?`, () =>
      start(async () => {
        const res = await updateOpportunityStage(id, "Perdida");
        if (res.ok) {
          toast.success("Oportunidad marcada como perdida");
          router.refresh();
        } else {
          toast.error(res.error);
        }
      })
    );
  }

  function eliminar() {
    setOpen(false);
    confirmDialog(`¿Eliminar la oportunidad N° ${numero}?`, () =>
      start(async () => {
        const res = await deleteOpportunity(id);
        if (res.ok) {
          toast.success("Oportunidad eliminada");
          router.push("/oportunidades");
        } else {
          toast.error(res.error);
        }
      })
    );
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Acciones <ChevronDown className="size-4" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-60 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {canEdit && (
            <Link
              href={`/oportunidades/${id}/editar`}
              className={itemCls}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <Pencil /> Editar oportunidad
            </Link>
          )}
          {canCreateQuotes && (
            <Link
              href={`/cotizaciones/nuevo?oportunidadId=${id}`}
              className={itemCls}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <DollarSign /> Registrar cotización
            </Link>
          )}
          {canRequestDesign &&
            (designRequestId ? (
              <Link
                href={`/backlog/${designRequestId}`}
                className={itemCls}
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <PencilRuler /> Ver en backlog de diseño
              </Link>
            ) : (
              <button
                type="button"
                className={itemCls}
                role="menuitem"
                disabled={!designQuoteId || pending}
                title={designQuoteId ? undefined : "Requiere una cotización"}
                onClick={solicitarPlanos}
              >
                <PencilRuler /> Solicitar planos/cambios
              </button>
            ))}
          <Link
            href={`/clientes/${clientId}`}
            className={itemCls}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Building2 /> Ver cliente
          </Link>
          {canEdit && estado !== "Perdida" && (
            <button
              type="button"
              className={itemCls}
              role="menuitem"
              disabled={pending}
              onClick={marcarPerdida}
            >
              <ThumbsDown /> Marcar como perdida
            </button>
          )}
          {canDelete && (
            <>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                className={`${itemCls} text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] [&_svg]:text-[hsl(var(--destructive))]`}
                role="menuitem"
                disabled={pending}
                onClick={eliminar}
              >
                <Trash2 /> Eliminar oportunidad
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
