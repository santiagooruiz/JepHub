"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Send, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  updateOrderState,
  approveOrderStep,
  sendToOfimatica,
  generateOrderFromQuote,
} from "./actions";
import { ORDER_ESTADOS, APPROVAL_KINDS, APPROVAL_LABELS } from "./types";

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

export type ApprovalItem = {
  kind: string;
  aprobado: boolean;
  approvedBy: string | null;
  fecha: string | null;
};

export function ApprovalsPanel({
  orderId,
  approvals,
}: {
  orderId: string;
  approvals: ApprovalItem[];
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const byKind = new Map(approvals.map((a) => [a.kind, a]));

  function approve(kind: (typeof APPROVAL_KINDS)[number]) {
    start(async () => {
      const res = await approveOrderStep(orderId, kind);
      if (res.ok) toast.success(`${APPROVAL_LABELS[kind]} aprobado`);
      else toast.error(res.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {APPROVAL_KINDS.map((kind) => {
        const a = byKind.get(kind);
        return (
          <div
            key={kind}
            className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
          >
            <div>
              <div className="font-medium">{APPROVAL_LABELS[kind]}</div>
              {a?.aprobado && (
                <div className="text-xs text-muted-foreground">
                  {a.approvedBy}
                  {a.fecha ? ` · ${a.fecha}` : ""}
                </div>
              )}
            </div>
            {a?.aprobado ? (
              <Badge variant="success">Aprobado</Badge>
            ) : (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => approve(kind)}>
                <Check className="size-4" /> Aprobar
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export type ErpState = {
  estadoEnvio: string | null;
  nPedidoOfimatica: string | null;
  ultimoError: string | null;
  fechaEnvio: string | null;
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

export function OfimaticaPanel({ orderId, erp }: { orderId: string; erp: ErpState }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const send = () =>
    start(async () => {
      setError(null);
      const res = await sendToOfimatica(orderId);
      if (res.ok) {
        toast.success("Pedido encolado para envío a ofimática");
      } else {
        setError(res.error);
        toast.error(res.error);
      }
      router.refresh();
    });

  if (erp.estadoEnvio === "ENVIADO") {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="success">ENVIADO</Badge>
          <span className="text-muted-foreground">N° {erp.nPedidoOfimatica}</span>
        </div>
        <Hito label="Fecha envío" fecha={erp.fechaEnvio} />
        <div className="border-t pt-1">
          <Hito label="Tapicería" fecha={erp.fechaTapiceria} />
          <Hito label="Listo" fecha={erp.fechaListo} />
          <Hito label="Despacho" fecha={erp.fechaDespacho} />
        </div>
        <Button variant="ghost" size="sm" className="w-full" disabled={pending} onClick={() => router.refresh()}>
          <RefreshCw className="size-4" /> Actualizar hitos
        </Button>
      </div>
    );
  }

  if (erp.estadoEnvio === "ENCOLADO") {
    return (
      <div className="space-y-2 text-sm">
        <Badge variant="muted">EN COLA</Badge>
        <p className="text-xs text-muted-foreground">
          El worker está procesando el envío al ERP. Actualiza en unos segundos.
        </p>
        <Button variant="ghost" size="sm" className="w-full" disabled={pending} onClick={() => router.refresh()}>
          <RefreshCw className="size-4" /> Actualizar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {erp.estadoEnvio === "ERROR" && (
        <div className="rounded-md border border-[hsl(var(--destructive))]/40 bg-destructive/5 p-2 text-xs text-[hsl(var(--destructive))]">
          Falló el envío: {erp.ultimoError ?? "error desconocido"}
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Envía el pedido al ERP de producción (worker + integración simulada).
      </p>
      <Button variant="outline" className="w-full" disabled={pending} onClick={send}>
        <Send className="size-4" /> {erp.estadoEnvio === "ERROR" ? "Reintentar envío" : "Enviar a ofimática"}
      </Button>
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
              if (res.erp === "ENCOLADO") {
                toast.success("Pedido generado — cotización encolada al ERP ofimática");
              } else if (res.erp === "ERROR") {
                toast.warning(
                  "Pedido generado, pero no se pudo encolar el envío al ERP. Reintenta desde el pedido."
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
