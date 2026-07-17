"use client";

// Tabla de líneas para los detalles internos de cotización y pedido: las
// carátulas se muestran colapsadas (título + suma) y un botón las despliega
// para ver los productos internos; los separadores son filas de solo texto.

import * as React from "react";
import { ChevronRight, Paperclip } from "lucide-react";

import { groupLineItems, medidasToString } from "./line-items";
import { formatMoney } from "./types";

export type LineItemRowData = {
  id: string;
  tipo: string;
  parentId: string | null;
  referencia: string | null;
  descripcion: string | null;
  acabados: string | null;
  esArea: boolean;
  largo: number | null;
  ancho: number | null;
  figura: boolean;
  /** Archivo adjunto de la línea (URL; lo usa el ítem ESPECIAL). */
  imagen: string | null;
  precio: number;
  cantidad: number;
  descuentoPct: number;
  total: number;
};

export function LineItemsTable({
  items,
  conDescuento = false,
}: {
  items: LineItemRowData[];
  /** Muestra la columna Desc.% (detalle de cotización; el pedido no la usa). */
  conDescuento?: boolean;
}) {
  const groups = React.useMemo(() => groupLineItems(items), [items]);
  // Carátulas desplegadas (por defecto todas colapsadas).
  const [abiertas, setAbiertas] = React.useState<Set<string>>(new Set());
  const columnas = conDescuento ? 6 : 5;

  function toggle(id: string) {
    setAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function productoRow(it: LineItemRowData, esHijo: boolean) {
    const medidas = medidasToString(it);
    return (
      <tr key={it.id} className="border-b last:border-0 align-top">
        <td className={`px-3 py-2 font-medium ${esHijo ? "pl-9" : ""}`}>
          {it.referencia || "—"}
        </td>
        <td className="px-3 py-2">
          {it.descripcion || "—"}
          {it.acabados && (
            <div className="text-xs text-muted-foreground">{it.acabados}</div>
          )}
          {medidas && (
            <div className="text-xs text-muted-foreground">{medidas}</div>
          )}
          {it.imagen && (
            <a
              href={it.imagen}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
            >
              <Paperclip className="size-3.5" /> Archivo adjunto
            </a>
          )}
        </td>
        <td className="px-3 py-2 text-right tabular whitespace-nowrap">
          {formatMoney(it.precio)}
        </td>
        <td className="px-3 py-2 text-right tabular">{it.cantidad}</td>
        {conDescuento && (
          <td className="px-3 py-2 text-right tabular">{it.descuentoPct}%</td>
        )}
        <td className="px-3 py-2 text-right tabular font-medium whitespace-nowrap">
          {formatMoney(it.total)}
        </td>
      </tr>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-3 py-2 font-medium">Referencia</th>
            <th className="px-3 py-2 font-medium">Descripción</th>
            <th className="px-3 py-2 text-right font-medium">Precio</th>
            <th className="px-3 py-2 text-right font-medium">Cant.</th>
            {conDescuento && (
              <th className="px-3 py-2 text-right font-medium">Desc.%</th>
            )}
            <th className="px-3 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(({ item: it, hijos }) => {
            if (it.tipo === "CARATULA") {
              const abierta = abiertas.has(it.id);
              const suma = hijos.reduce((s, h) => s + h.total, 0);
              return (
                <React.Fragment key={it.id}>
                  <tr className="border-b bg-muted/30 align-middle">
                    <td className="px-3 py-2" colSpan={columnas - 1}>
                      <button
                        type="button"
                        onClick={() => toggle(it.id)}
                        aria-expanded={abierta}
                        className="inline-flex items-center gap-2 font-semibold hover:underline underline-offset-4"
                        title={
                          abierta ? "Ocultar productos" : "Desplegar productos"
                        }
                      >
                        <ChevronRight
                          className={`size-4 shrink-0 text-muted-foreground transition-transform ${abierta ? "rotate-90" : ""}`}
                        />
                        {it.descripcion || "—"}
                      </button>
                      <span className="ml-2 text-xs text-muted-foreground">
                        Carátula · {hijos.length} producto
                        {hijos.length === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular font-semibold whitespace-nowrap">
                      {formatMoney(suma)}
                    </td>
                  </tr>
                  {abierta && hijos.map((h) => productoRow(h, true))}
                </React.Fragment>
              );
            }
            if (it.tipo === "SEPARADOR") {
              return (
                <tr key={it.id} className="border-b bg-muted/10 align-middle">
                  <td
                    className="px-3 py-2 font-semibold tracking-wide uppercase"
                    colSpan={columnas}
                  >
                    {it.descripcion || "—"}
                  </td>
                </tr>
              );
            }
            return productoRow(it, false);
          })}
        </tbody>
      </table>
    </div>
  );
}
