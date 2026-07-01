import { formatMoney } from "./types";

export type QuoteDocData = {
  numero: number;
  clienteNombre: string;
  clienteDoc: string;
  registradoPor: string;
  oportunidad: string;
  formaPago: string;
  tiempoEntrega: string;
  fechaVencimiento: string;
  ordenCompra: string;
  direccionEnvio: string;
  estado: string;
  items: {
    referencia: string;
    descripcion: string;
    acabados: string;
    precio: number;
    cantidad: number;
    descuentoPct: number;
    total: number;
  }[];
  subtotal: number;
  impuesto: number;
  total: number;
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-neutral-500">{label}: </span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

/** Documento de cotización estilo factura (usado en impresión y firma). */
export function QuoteDocument({ q }: { q: QuoteDocData }) {
  return (
    <div className="rounded-lg border bg-white p-6 text-neutral-900">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-md bg-neutral-900 font-bold text-white">
            J
          </div>
          <div>
            <div className="font-semibold">JEP Mobiliari</div>
            <div className="text-xs text-neutral-500">Cotización</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">N° {q.numero}</div>
          <div className="text-xs text-neutral-500">{q.estado}</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-1 border-y py-3 sm:grid-cols-2">
        <Info label="Cliente" value={q.clienteNombre} />
        <Info label="Documento" value={q.clienteDoc} />
        <Info label="Oportunidad" value={q.oportunidad} />
        <Info label="Registrado por" value={q.registradoPor} />
        <Info label="Forma de pago" value={q.formaPago} />
        <Info label="Tiempo de entrega" value={q.tiempoEntrega} />
        <Info label="Vencimiento" value={q.fechaVencimiento} />
        <Info label="Orden de compra" value={q.ordenCompra} />
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-neutral-100 text-left">
            <th className="px-2 py-2 font-medium">Referencia</th>
            <th className="px-2 py-2 font-medium">Descripción</th>
            <th className="px-2 py-2 text-right font-medium">Precio</th>
            <th className="px-2 py-2 text-right font-medium">Cant.</th>
            <th className="px-2 py-2 text-right font-medium">Desc.%</th>
            <th className="px-2 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {q.items.map((it, i) => (
            <tr key={i} className="border-b align-top">
              <td className="px-2 py-2 font-medium">{it.referencia || "—"}</td>
              <td className="px-2 py-2">
                {it.descripcion || "—"}
                {it.acabados && (
                  <div className="text-xs text-neutral-500">{it.acabados}</div>
                )}
              </td>
              <td className="px-2 py-2 text-right whitespace-nowrap">
                {formatMoney(it.precio)}
              </td>
              <td className="px-2 py-2 text-right">{it.cantidad}</td>
              <td className="px-2 py-2 text-right">{it.descuentoPct}%</td>
              <td className="px-2 py-2 text-right font-medium whitespace-nowrap">
                {formatMoney(it.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Subtotal</span>
            <span>{formatMoney(q.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">IVA (19%)</span>
            <span>{formatMoney(q.impuesto)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 text-base font-bold">
            <span>Total</span>
            <span>{formatMoney(q.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
