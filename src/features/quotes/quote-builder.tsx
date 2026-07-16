"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Layers, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { saveQuote, getQuoteClientInfo, type QuoteClientInfo } from "./actions";
import { QUOTE_ESTADOS, IVA_RATE, formatMoney } from "./types";
import type { QuoteOptions } from "./queries";

type ItemTipo = "PRODUCTO" | "CARATULA";

type Item = {
  key: string;
  tipo: ItemTipo;
  /** key de la carátula a la que pertenece (solo productos dentro de una). */
  parentKey: string | null;
  productId: string | null;
  referencia: string;
  /** En carátulas guarda el título (p. ej. "ISLA 8 PUESTOS"). */
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
    id: string;
    tipo: string;
    parentId: string | null;
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

function emptyItem(parentKey: string | null = null): Item {
  return {
    key: newKey(),
    tipo: "PRODUCTO",
    parentKey,
    productId: null,
    referencia: "",
    descripcion: "",
    precio: 0,
    cantidad: 1,
    descuentoPct: 0,
    acabados: "",
  };
}

function emptyCaratula(): Item {
  return {
    key: newKey(),
    tipo: "CARATULA",
    parentKey: null,
    productId: null,
    referencia: "",
    descripcion: "",
    precio: 0,
    cantidad: 1,
    descuentoPct: 0,
    acabados: "",
  };
}

/** Reconstruye el estado del builder desde las líneas guardadas (ordenadas por
 * posición: cada hija aparece después de su carátula). */
function initItems(editingItems: QuoteEditing["items"]): Item[] {
  const keyById = new Map<string, string>();
  return editingItems.map((it) => {
    const key = newKey();
    keyById.set(it.id, key);
    return {
      key,
      tipo: it.tipo === "CARATULA" ? ("CARATULA" as const) : ("PRODUCTO" as const),
      parentKey: it.parentId ? (keyById.get(it.parentId) ?? null) : null,
      productId: it.productId,
      referencia: it.referencia ?? "",
      descripcion: it.descripcion ?? "",
      precio: it.precio,
      cantidad: it.cantidad,
      descuentoPct: it.descuentoPct,
      acabados: it.acabados ?? "",
    };
  });
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
  defaults,
}: {
  options: QuoteOptions;
  editing?: QuoteEditing;
  /** Preselección al crear desde la ficha de oportunidad/cliente. */
  defaults?: { clientId?: string; opportunityId?: string };
}) {
  const router = useRouter();
  const [h, setH] = React.useState({
    clientId: editing?.clientId ?? defaults?.clientId ?? "",
    opportunityId: editing?.opportunityId ?? defaults?.opportunityId ?? "",
    estado: editing?.estado ?? QUOTE_ESTADOS[0],
    formaPago: editing?.formaPago ?? "",
    tiempoEntrega: editing?.tiempoEntrega ?? "",
    ordenCompra: editing?.ordenCompra ?? "",
    direccionEnvio: editing?.direccionEnvio ?? "",
    observacion: editing?.observacion ?? "",
    fechaVencimiento: editing?.fechaVencimiento ?? "",
  });
  const [items, setItems] = React.useState<Item[]>(() =>
    editing?.items.length ? initItems(editing.items) : [emptyItem()]
  );
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  // Datos del cliente (teléfono, email, lista de precio y dirección) leídos
  // del ERP (MTPROCLI) al seleccionar cliente. DIRECCION prellena la
  // "Dirección de envío" (editable); al editar se respeta la ya guardada.
  const [info, setInfo] = React.useState<QuoteClientInfo | null>(null);
  const firstLoad = React.useRef(true);
  React.useEffect(() => {
    const skipPrefill = firstLoad.current && Boolean(editing?.direccionEnvio);
    firstLoad.current = false;
    if (!h.clientId) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    getQuoteClientInfo(h.clientId).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setInfo(null);
        return;
      }
      setInfo(res.info);
      if (!skipPrefill) {
        setH((p) => ({ ...p, direccionEnvio: res.info.direccion }));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h.clientId]);

  function setHeader<K extends keyof typeof h>(k: K, v: (typeof h)[K]) {
    setH((p) => ({ ...p, [k]: v }));
  }
  function setItem(key: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }
  /** Quita un ítem; si es una carátula, arrastra también a sus productos. */
  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key && i.parentKey !== key));
  }
  /** Agrega un producto dentro de una carátula, tras su último hijo. */
  function addHijo(caratulaKey: string) {
    setItems((prev) => {
      let idx = -1;
      for (let i = 0; i < prev.length; i++) {
        if (prev[i].key === caratulaKey || prev[i].parentKey === caratulaKey) {
          idx = i;
        }
      }
      if (idx < 0) return prev;
      const next = [...prev];
      next.splice(idx + 1, 0, emptyItem(caratulaKey));
      return next;
    });
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
  const topLevel = rows.filter((r) => !r.parentKey);
  const hijosDe = (key: string) => rows.filter((r) => r.parentKey === key);
  // Las carátulas no suman por sí mismas: el subtotal sale de los productos.
  const subtotal = rows
    .filter((r) => r.tipo === "PRODUCTO")
    .reduce((s, r) => s + r.total, 0);
  const impuesto = subtotal * IVA_RATE;
  const total = subtotal + impuesto;

  const oppsForClient = options.opportunities.filter(
    (o) => !h.clientId || o.clientId === h.clientId
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const prodPayload = (it: Item) => ({
      productId: it.productId,
      referencia: it.referencia,
      descripcion: it.descripcion,
      acabados: it.acabados,
      observacionesInternas: null,
      precio: it.precio,
      cantidad: it.cantidad,
      descuentoPct: it.descuentoPct,
    });
    start(async () => {
      const res = await saveQuote({
        id: editing?.id,
        ...h,
        // Payload anidado en el orden visual: productos sueltos y carátulas
        // con sus hijos (el servidor aplana y asigna posiciones).
        items: items
          .filter((it) => !it.parentKey)
          .map((it) =>
            it.tipo === "CARATULA"
              ? {
                  tipo: "CARATULA" as const,
                  titulo: it.descripcion,
                  hijos: items
                    .filter((x) => x.parentKey === it.key)
                    .map(prodPayload),
                }
              : { tipo: "PRODUCTO" as const, ...prodPayload(it) }
          ),
      });
      if (res.ok) {
        toast.success(
          editing ? "Cotización modificada" : "Cotización registrada"
        );
        router.push(`/cotizaciones/${res.id}`);
        router.refresh();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  type Row = (typeof rows)[number];

  function renderCaratulaRow(r: Row) {
    const totalCaratula = hijosDe(r.key).reduce((s, h) => s + h.total, 0);
    return (
      <tr className="border-b bg-muted/40 align-middle">
        <td className="px-2 py-2" colSpan={2}>
          <div className="flex items-center gap-2">
            <Layers className="size-4 shrink-0 text-muted-foreground" />
            <Input
              value={r.descripcion}
              onChange={(e) => setItem(r.key, { descripcion: e.target.value })}
              placeholder="Título de la carátula (p. ej. ISLA 8 PUESTOS)"
              className="font-medium"
              aria-label="Título de la carátula"
            />
          </div>
        </td>
        <td className="px-2 py-2 text-right" colSpan={3}>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => addHijo(r.key)}
          >
            <Plus className="size-4" /> Producto
          </Button>
        </td>
        <td className="px-2 py-2 text-right tabular font-semibold whitespace-nowrap">
          {formatMoney(totalCaratula)}
        </td>
        <td className="px-2 py-2">
          <button
            type="button"
            onClick={() => removeItem(r.key)}
            className="inline-flex size-8 items-center justify-center rounded-md text-[hsl(var(--destructive))] hover:bg-destructive/10"
            aria-label="Quitar carátula y sus productos"
          >
            <Trash2 className="size-4" />
          </button>
        </td>
      </tr>
    );
  }

  function renderProductoRow(r: Row, esHijo: boolean) {
    return (
      <tr key={r.key} className="border-b last:border-0 align-top">
        <td className={`px-2 py-2 min-w-40 ${esHijo ? "pl-8" : ""}`}>
          <SearchableSelect
            value={r.productId ?? ""}
            onChange={(v) => pickProduct(r.key, v)}
            options={options.products.map((p) => ({
              value: p.id,
              label: p.codigo,
            }))}
            placeholder="— libre —"
            aria-label="Producto"
          />
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
            onClick={() => removeItem(r.key)}
            className="inline-flex size-8 items-center justify-center rounded-md text-[hsl(var(--destructive))] hover:bg-destructive/10"
            aria-label="Quitar ítem"
          >
            <Trash2 className="size-4" />
          </button>
        </td>
      </tr>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Encabezado */}
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Datos de la cotización</h3>
          <span className="text-sm text-muted-foreground">
            Fecha: {new Date().toLocaleDateString("es-CO")}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Cliente">
            <SearchableSelect
              value={h.clientId}
              onChange={(v) => setHeader("clientId", v)}
              options={options.clients.map((c) => ({ value: c.id, label: c.name }))}
              aria-label="Cliente"
            />
          </Field>
          <Field label="Oportunidad">
            <SearchableSelect
              value={h.opportunityId ?? ""}
              onChange={(v) => setHeader("opportunityId", v)}
              options={oppsForClient.map((o) => ({ value: o.id, label: o.label }))}
              placeholder="(ninguna)"
              aria-label="Oportunidad"
            />
          </Field>
          <Field label="Estado">
            <SearchableSelect
              value={h.estado}
              onChange={(v) => setHeader("estado", v)}
              options={[...QUOTE_ESTADOS]}
              clearable={false}
              aria-label="Estado"
            />
          </Field>
          <Field label="Forma de pago">
            <Input value={h.formaPago} onChange={(e) => setHeader("formaPago", e.target.value)} />
          </Field>
          <Field label="Tiempo de entrega">
            <Input value={h.tiempoEntrega} onChange={(e) => setHeader("tiempoEntrega", e.target.value)} />
          </Field>
          <Field label="Validez de la oferta (vencimiento)">
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
            <Input
              value={h.direccionEnvio}
              onChange={(e) => setHeader("direccionEnvio", e.target.value)}
              placeholder="Se toma de la dirección del cliente"
            />
          </Field>
        </div>

        {info && (
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Teléfono</span>
              <span className="text-right font-medium">{info.telefono || "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span className="truncate text-right font-medium">{info.email || "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Lista de precio</span>
              <span className="text-right font-medium">{info.listaPrecio || "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Dirección principal</span>
              <span className="text-right font-medium">{info.direccion || "—"}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Ítems */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold">Ítems</h3>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setItems((p) => [...p, emptyCaratula()])}
              title="Agrupa productos bajo un título; en el PDF del cliente se imprime solo la carátula con la suma"
            >
              <Layers className="size-4" /> Añadir carátula
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setItems((p) => [...p, emptyItem()])}>
              <Plus className="size-4" /> Añadir ítem
            </Button>
          </div>
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
              {topLevel.map((r) =>
                r.tipo === "CARATULA" ? (
                  <React.Fragment key={r.key}>
                    {renderCaratulaRow(r)}
                    {hijosDe(r.key).map((hijo) => renderProductoRow(hijo, true))}
                  </React.Fragment>
                ) : (
                  renderProductoRow(r, false)
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Observaciones + Totales */}
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 space-y-1.5 sm:max-w-md">
            <label className="text-sm font-medium">Observaciones</label>
            <textarea
              value={h.observacion}
              onChange={(e) => setHeader("observacion", e.target.value)}
              rows={4}
              placeholder="Observaciones"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
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
