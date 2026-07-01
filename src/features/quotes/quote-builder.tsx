"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { saveQuote } from "./actions";
import { QUOTE_ESTADOS, IVA_RATE, formatMoney } from "./types";
import type { QuoteOptions } from "./queries";

type Item = {
  key: string;
  productId: string | null;
  referencia: string;
  descripcion: string;
  precio: number;
  cantidad: number;
  descuentoPct: number;
  acabados: string;
};

export type QuoteEditing = {
  id: string;
  clientId: string;
  opportunityId: string | null;
  estado: string;
  formaPago: string | null;
  tiempoEntrega: string | null;
  ordenCompra: string | null;
  direccionEnvio: string | null;
  observacion: string | null;
  fechaVencimiento: string | null;
  items: {
    productId: string | null;
    referencia: string | null;
    descripcion: string | null;
    precio: number;
    cantidad: number;
    descuentoPct: number;
    acabados: string | null;
  }[];
};

const selectCls =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

let counter = 0;
const newKey = () => `it-${counter++}`;

function emptyItem(): Item {
  return {
    key: newKey(),
    productId: null,
    referencia: "",
    descripcion: "",
    precio: 0,
    cantidad: 1,
    descuentoPct: 0,
    acabados: "",
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

export function QuoteBuilder({
  options,
  editing,
}: {
  options: QuoteOptions;
  editing?: QuoteEditing;
}) {
  const router = useRouter();
  const [h, setH] = React.useState({
    clientId: editing?.clientId ?? "",
    opportunityId: editing?.opportunityId ?? "",
    estado: editing?.estado ?? QUOTE_ESTADOS[0],
    formaPago: editing?.formaPago ?? "",
    tiempoEntrega: editing?.tiempoEntrega ?? "",
    ordenCompra: editing?.ordenCompra ?? "",
    direccionEnvio: editing?.direccionEnvio ?? "",
    observacion: editing?.observacion ?? "",
    fechaVencimiento: editing?.fechaVencimiento ?? "",
  });
  const [items, setItems] = React.useState<Item[]>(
    editing?.items.length
      ? editing.items.map((it) => ({
          key: newKey(),
          productId: it.productId,
          referencia: it.referencia ?? "",
          descripcion: it.descripcion ?? "",
          precio: it.precio,
          cantidad: it.cantidad,
          descuentoPct: it.descuentoPct,
          acabados: it.acabados ?? "",
        }))
      : [emptyItem()]
  );
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function setHeader<K extends keyof typeof h>(k: K, v: (typeof h)[K]) {
    setH((p) => ({ ...p, [k]: v }));
  }
  function setItem(key: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }
  function pickProduct(key: string, productId: string) {
    const p = options.products.find((x) => x.id === productId);
    if (!p) {
      setItem(key, { productId: null });
      return;
    }
    setItem(key, {
      productId: p.id,
      referencia: p.codigo,
      descripcion: p.nombre,
      precio: p.precioBase,
      acabados: p.acabados ?? "",
    });
  }

  const rows = items.map((it) => {
    const precioConDesc = it.precio * (1 - it.descuentoPct / 100);
    return { ...it, precioConDesc, total: precioConDesc * it.cantidad };
  });
  const subtotal = rows.reduce((s, r) => s + r.total, 0);
  const impuesto = subtotal * IVA_RATE;
  const total = subtotal + impuesto;

  const oppsForClient = options.opportunities.filter(
    (o) => !h.clientId || o.clientId === h.clientId
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveQuote({
        id: editing?.id,
        ...h,
        items: items.map((it) => ({
          productId: it.productId,
          referencia: it.referencia,
          descripcion: it.descripcion,
          acabados: it.acabados,
          observacionesInternas: null,
          precio: it.precio,
          cantidad: it.cantidad,
          descuentoPct: it.descuentoPct,
        })),
      });
      if (res.ok) {
        router.push(`/cotizaciones/${res.id}`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Encabezado */}
      <Card className="p-4">
        <h3 className="mb-4 font-semibold">Datos de la cotización</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Cliente">
            <select
              required
              value={h.clientId}
              onChange={(e) => setHeader("clientId", e.target.value)}
              className={selectCls}
            >
              <option value="">Seleccione</option>
              {options.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Oportunidad">
            <select
              value={h.opportunityId ?? ""}
              onChange={(e) => setHeader("opportunityId", e.target.value)}
              className={selectCls}
            >
              <option value="">(ninguna)</option>
              {oppsForClient.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select
              value={h.estado}
              onChange={(e) => setHeader("estado", e.target.value)}
              className={selectCls}
            >
              {QUOTE_ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Forma de pago">
            <Input value={h.formaPago} onChange={(e) => setHeader("formaPago", e.target.value)} />
          </Field>
          <Field label="Tiempo de entrega">
            <Input value={h.tiempoEntrega} onChange={(e) => setHeader("tiempoEntrega", e.target.value)} />
          </Field>
          <Field label="Fecha de vencimiento">
            <input
              type="date"
              value={h.fechaVencimiento}
              onChange={(e) => setHeader("fechaVencimiento", e.target.value)}
              className={selectCls}
            />
          </Field>
          <Field label="Orden de compra">
            <Input value={h.ordenCompra} onChange={(e) => setHeader("ordenCompra", e.target.value)} />
          </Field>
          <Field label="Dirección de envío">
            <Input value={h.direccionEnvio} onChange={(e) => setHeader("direccionEnvio", e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* Ítems */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Ítems</h3>
          <Button type="button" size="sm" variant="outline" onClick={() => setItems((p) => [...p, emptyItem()])}>
            <Plus className="size-4" /> Añadir ítem
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-2 py-2 font-medium">Producto</th>
                <th className="px-2 py-2 font-medium">Descripción</th>
                <th className="px-2 py-2 text-right font-medium">Precio</th>
                <th className="px-2 py-2 text-right font-medium">Cant.</th>
                <th className="px-2 py-2 text-right font-medium">Desc.%</th>
                <th className="px-2 py-2 text-right font-medium">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b last:border-0 align-top">
                  <td className="px-2 py-2 min-w-40">
                    <select
                      value={r.productId ?? ""}
                      onChange={(e) => pickProduct(r.key, e.target.value)}
                      className={selectCls}
                    >
                      <option value="">— libre —</option>
                      {options.products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.codigo}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 min-w-48">
                    <Input
                      value={r.descripcion}
                      onChange={(e) => setItem(r.key, { descripcion: e.target.value })}
                      placeholder="Descripción"
                    />
                    {r.acabados && (
                      <span className="text-xs text-muted-foreground">{r.acabados}</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      className="w-28 text-right"
                      value={r.precio}
                      onChange={(e) => setItem(r.key, { precio: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      className="w-16 text-right"
                      value={r.cantidad}
                      onChange={(e) => setItem(r.key, { cantidad: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      className="w-16 text-right"
                      value={r.descuentoPct}
                      onChange={(e) => setItem(r.key, { descuentoPct: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="px-2 py-2 text-right tabular font-medium whitespace-nowrap">
                    {formatMoney(r.total)}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => setItems((p) => p.filter((i) => i.key !== r.key))}
                      className="inline-flex size-8 items-center justify-center rounded-md text-[hsl(var(--destructive))] hover:bg-destructive/10"
                      aria-label="Quitar ítem"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA (19%)</span>
              <span className="tabular">{formatMoney(impuesto)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 text-base font-bold">
              <span>Total</span>
              <span className="tabular">{formatMoney(total)}</span>
            </div>
          </div>
        </div>
      </Card>

      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {editing ? "Guardar cambios" : "Registrar cotización"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/cotizaciones")}>
          Volver
        </Button>
      </div>
    </form>
  );
}
