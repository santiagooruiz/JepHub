import { Fragment } from "react";

import { formatMoney } from "./types";

export type QuoteDocItem = {
  tipo: "PRODUCTO" | "CARATULA" | "SEPARADOR";
  referencia: string;
  descripcion: string;
  acabados: string;
  precio: number;
  cantidad: number;
  descuentoPct: number;
  total: number;
  /**
   * Productos internos de una carátula. Solo vienen en la variante interna
   * "con desglose" (mapQuoteToDoc con detalleCaratulas): de cara al cliente
   * no deben viajar en los datos del documento.
   */
  hijos?: Omit<QuoteDocItem, "tipo" | "hijos">[];
};

export type QuoteDocData = {
  numero: number;
  fecha: string;
  clienteNombre: string;
  clienteDoc: string;
  registradoPor: string;
  oportunidad: string;
  formaPago: string;
  tiempoEntrega: string;
  fechaVencimiento: string;
  ordenCompra: string;
  direccionEnvio: string;
  observacion: string;
  estado: string;
  items: QuoteDocItem[];
  subtotal: number;
  impuesto: number;
  total: number;
};

function CondRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

/**
 * Documento de cotización estilo factura (usado en impresión y firma). Las
 * carátulas se imprimen como una sola línea con la suma de sus productos; si
 * los datos traen `hijos` (variante interna "con desglose") se listan debajo.
 */
export function QuoteDocument({ q }: { q: QuoteDocData }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white text-neutral-900 shadow-sm [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:rounded-none print:border-0 print:shadow-none">
      <div className="h-1.5 bg-[#12A2BC]" />

      <div className="p-8 print:p-6">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-neutral-900 text-lg font-bold text-white">
              J
            </div>
            <div>
              <div className="text-lg leading-tight font-semibold">
                JEP Mobiliari
              </div>
              <div className="text-xs text-neutral-500">
                Mobiliario a la medida
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold tracking-[0.18em] text-[#12A2BC] uppercase">
              Cotización
            </div>
            <div className="text-2xl leading-tight font-bold">
              N° {q.numero}
            </div>
            <span className="mt-1 inline-block rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
              {q.estado}
            </span>
          </div>
        </div>

        {/* Cliente y condiciones */}
        <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-4 rounded-md border bg-neutral-50 p-4 sm:grid-cols-2">
          <div className="text-sm">
            <div className="mb-1 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
              Cliente
            </div>
            <div className="font-semibold">{q.clienteNombre}</div>
            <div className="text-neutral-600">{q.clienteDoc || "—"}</div>
            {q.direccionEnvio && (
              <div className="text-neutral-600">{q.direccionEnvio}</div>
            )}
            {q.oportunidad && (
              <div className="mt-2 text-neutral-600">
                <span className="text-neutral-500">Oportunidad: </span>
                <span className="font-medium text-neutral-900">
                  {q.oportunidad}
                </span>
              </div>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="mb-1 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
              Condiciones
            </div>
            <CondRow label="Fecha de emisión" value={q.fecha} />
            <CondRow label="Vencimiento" value={q.fechaVencimiento} />
            <CondRow label="Forma de pago" value={q.formaPago} />
            <CondRow label="Tiempo de entrega" value={q.tiempoEntrega} />
            <CondRow label="Orden de compra" value={q.ordenCompra} />
          </div>
        </div>

        {/* Ítems */}
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-neutral-900 text-left text-white">
              <th className="px-3 py-2.5 font-medium">Referencia</th>
              <th className="px-3 py-2.5 font-medium">Descripción</th>
              <th className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                Precio unit.
              </th>
              <th className="px-3 py-2.5 text-right font-medium">Cant.</th>
              <th className="px-3 py-2.5 text-right font-medium">Desc.</th>
              <th className="px-3 py-2.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {q.items.map((it, i) =>
              it.tipo === "SEPARADOR" ? (
                <tr key={i} className="border-b border-neutral-200 bg-neutral-100">
                  <td
                    className="px-3 py-2 font-semibold tracking-wide uppercase"
                    colSpan={6}
                  >
                    {it.descripcion || "—"}
                  </td>
                </tr>
              ) : it.tipo === "CARATULA" ? (
                <Fragment key={i}>
                  <tr className="border-b border-neutral-200 align-top">
                    <td className="px-3 py-2.5 font-medium">—</td>
                    <td className="w-full px-3 py-2.5 font-semibold">
                      {it.descripcion || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {formatMoney(it.precio)}
                    </td>
                    <td className="px-3 py-2.5 text-right">{it.cantidad}</td>
                    <td className="px-3 py-2.5 text-right">—</td>
                    <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                      {formatMoney(it.total)}
                    </td>
                  </tr>
                  {it.hijos?.map((h, j) => (
                      <tr
                        key={j}
                        className="border-b border-neutral-100 align-top text-xs text-neutral-500"
                      >
                        <td className="px-3 py-1.5 pl-6">{h.referencia || "—"}</td>
                        <td className="w-full px-3 py-1.5">
                          {h.descripcion || "—"}
                          {h.acabados && (
                            <div className="mt-0.5 text-[11px] text-neutral-400">
                              {h.acabados}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                          {formatMoney(h.precio)}
                        </td>
                        <td className="px-3 py-1.5 text-right">{h.cantidad}</td>
                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                          {h.descuentoPct}%
                        </td>
                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                          {formatMoney(h.total)}
                        </td>
                      </tr>
                    ))}
                </Fragment>
              ) : (
                <tr key={i} className="border-b border-neutral-200 align-top">
                  <td className="px-3 py-2.5 font-medium">
                    {it.referencia || "—"}
                  </td>
                  <td className="w-full px-3 py-2.5">
                    {it.descripcion || "—"}
                    {it.acabados && (
                      <div className="mt-0.5 text-xs text-neutral-500">
                        {it.acabados}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {formatMoney(it.precio)}
                  </td>
                  <td className="px-3 py-2.5 text-right">{it.cantidad}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {it.descuentoPct}%
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                    {formatMoney(it.total)}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        {/* Observaciones y totales */}
        <div className="mt-6 flex flex-col-reverse justify-between gap-6 sm:flex-row">
          <div className="max-w-sm text-sm">
            {q.observacion && (
              <>
                <div className="mb-1 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                  Observaciones
                </div>
                <p className="whitespace-pre-line text-neutral-600">
                  {q.observacion}
                </p>
              </>
            )}
          </div>
          <div className="w-full space-y-1.5 text-sm sm:w-72">
            <div className="flex justify-between px-3">
              <span className="text-neutral-500">Subtotal</span>
              <span className="font-medium">{formatMoney(q.subtotal)}</span>
            </div>
            <div className="flex justify-between px-3">
              <span className="text-neutral-500">IVA (19%)</span>
              <span className="font-medium">{formatMoney(q.impuesto)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-md bg-neutral-900 px-3 py-2 text-white">
              <span className="font-semibold">Total</span>
              <span className="text-base font-bold">
                {formatMoney(q.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Pie */}
        <div className="mt-8 flex items-center justify-between border-t pt-3 text-xs text-neutral-400">
          <span>
            {q.registradoPor
              ? `Registrado por ${q.registradoPor}`
              : "JEP Mobiliari"}
          </span>
          <span>
            Cotización N° {q.numero}
            {q.fecha ? ` · ${q.fecha}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
