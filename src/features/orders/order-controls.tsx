"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  updateOrderState,
  linkErpCotizacion,
  refreshErpStatus,
  generateOrderFromQuote,
} from "./actions";
import {
  ORDER_ESTADOS,
  APPROVAL_LABELS,
  type ErpApprovalStatus,
} from "./types";

export function OrderStateSelect({ id, estado }: { id: string; estado: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <SearchableSelect
      value={estado}
      disabled={pending}
      onChange={(v) =>
        start(async () => {
          const res = await updateOrderState(id, v);
          if (res.ok) toast.success(`Pedido actualizado a ${v}`);
          else toast.error(res.error);
          router.refresh();
        })
      }
      options={[...ORDER_ESTADOS]}
      clearable={false}
      className="h-8 w-auto min-w-40 px-2"
      aria-label="Estado del pedido"
    />
  );
}

/**
 * Panel de seguimiento (solo lectura). Los procesos de ingreso/fabricación/
 * instalación/facturación se gestionan en el ERP (ofimática); aquí se reflejan
 * a partir de sus datos (pedido generado + hitos de producción).
 */
export function ApprovalsPanel({ items }: { items: ErpApprovalStatus[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Estos procesos se gestionan en el ERP (ofimática). Aquí solo se muestran
        como seguimiento.
      </p>
      {items.map((a) => (
        <div
          key={a.kind}
          className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
        >
          <div>
            <div className="font-medium">{APPROVAL_LABELS[a.kind]}</div>
            {a.fecha && (
              <div className="text-xs text-muted-foreground">
                {a.fecha.toLocaleDateString("es-CO")}
              </div>
            )}
          </div>
          {a.estado === "completado" ? (
            <Badge variant="success">Completado</Badge>
          ) : a.estado === "en_proceso" ? (
            <Badge variant="default">En proceso</Badge>
          ) : (
            <Badge variant="muted">Pendiente</Badge>
          )}
        </div>
      ))}
    </div>
  );
}

export type ErpState = {
  /** N° de cotización (CV) en el ERP — el que asigna ofimática al ingresarla. */
  nCotizacionErp: string | null;
  /** N° de pedido (PD) que el ERP generó a partir de la CV (solo lectura). */
  nroPedidoErp: string | null;
  fechaTapiceria: string | null;
  fechaListo: string | null;
  fechaDespacho: string | null;
};

function Hito({ label, fecha }: { label: string; fecha: string | null }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      {fecha ? (
        <span className="tabular">{fecha}</span>
      ) : (
        <span className="text-muted-foreground/60">pendiente</span>
      )}
    </div>
  );
}

/**
 * Seguimiento del ERP (ofimática). Como la cotización se ingresa manualmente en
 * el ERP, aquí se vincula su N° (CV) y con él se consulta el pedido (PD) generado
 * y sus hitos de producción. Solo para roles con `orders.send_ofimatica`.
 */
export function OfimaticaPanel({
  orderId,
  erp,
  canManage,
}: {
  orderId: string;
  erp: ErpState;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [cv, setCv] = React.useState(erp.nCotizacionErp ?? "");
  const [error, setError] = React.useState<string | null>(null);

  const link = () =>
    start(async () => {
      setError(null);
      const res = await linkErpCotizacion(orderId, cv);
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      // Vinculada: consulta de inmediato el pedido y los hitos.
      const st = await refreshErpStatus(orderId);
      if (st.ok) {
        toast.success(
          st.pd
            ? `Vinculada. Pedido en ofimática: N° ${st.pd}`
            : "Vinculada. El ERP aún no genera el pedido (PD)."
        );
      } else {
        toast.error(st.error);
      }
      router.refresh();
    });

  const refresh = () =>
    start(async () => {
      setError(null);
      const st = await refreshErpStatus(orderId);
      if (st.ok) {
        toast.success(
          st.pd ? `Pedido en ofimática: N° ${st.pd}` : "El ERP aún no genera el pedido (PD)."
        );
      } else {
        setError(st.error);
        toast.error(st.error);
      }
      router.refresh();
    });

  return (
    <div className="space-y-3 text-sm">
      {erp.nCotizacionErp ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">N° Cotización (CV)</span>
            <span className="tabular font-medium">{erp.nCotizacionErp}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">N° Pedido (PD)</span>
            {erp.nroPedidoErp ? (
              <Badge variant="success">{erp.nroPedidoErp}</Badge>
            ) : (
              <span className="text-muted-foreground/60">sin generar</span>
            )}
          </div>
          <div className="border-t pt-1">
            <Hito label="Tapicería" fecha={erp.fechaTapiceria} />
            <Hito label="Listo" fecha={erp.fechaListo} />
            <Hito label="Despacho" fecha={erp.fechaDespacho} />
          </div>
          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={pending}
              onClick={refresh}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Consultar estado en ofimática
            </Button>
          )}
        </div>
      ) : canManage ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Ingresa el N° de cotización (CV) que asignó ofimática para vincular
            este pedido y hacer seguimiento del pedido (PD) y sus hitos.
          </p>
          <div className="flex gap-2">
            <Input
              value={cv}
              onChange={(e) => setCv(e.target.value)}
              placeholder="Ej. 46157"
              inputMode="numeric"
              className="h-9"
            />
            <Button disabled={pending || !cv.trim()} onClick={link}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Link2 className="size-4" />
              )}
              Vincular
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Aún sin vincular con ofimática.
        </p>
      )}
      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  );
}

export function GenerateOrderButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  return (
    <div>
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await generateOrderFromQuote(quoteId);
            if (res.ok) {
              if (res.mail === "ENVIADO") {
                toast.success("Pedido generado — correo enviado para ingreso en ofimática");
              } else if (res.mail === "ERROR") {
                toast.warning(
                  "Pedido generado, pero no se pudo enviar el correo de ingreso a ofimática."
                );
              } else {
                toast.success("Pedido generado");
              }
              router.push(`/pedidos/${res.id}`);
            } else {
              setError(res.error);
              toast.error(res.error);
            }
          })
        }
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Generando…" : "Generar pedido"}
      </Button>
      {error && <p className="mt-1 text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  );
}
