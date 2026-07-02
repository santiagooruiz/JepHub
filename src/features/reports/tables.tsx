import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatMoney, quoteEstadoVariant } from "@/features/quotes/types";

export function PivotTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: { label: string; cells: number[]; total: number }[];
}) {
  const colTotals = columns.map((_, i) => rows.reduce((s, r) => s + r.cells[i], 0));
  const grand = colTotals.reduce((s, c) => s + c, 0);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-3 py-2 font-medium">Asesor</th>
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap px-3 py-2 text-right font-medium">
                {c}
              </th>
            ))}
            <th className="px-3 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b last:border-0">
              <td className="px-3 py-2 font-medium">{r.label}</td>
              {r.cells.map((v, i) => (
                <td key={i} className="px-3 py-2 text-right tabular whitespace-nowrap text-muted-foreground">
                  {v ? formatMoney(v) : "—"}
                </td>
              ))}
              <td className="px-3 py-2 text-right tabular font-medium whitespace-nowrap">
                {formatMoney(r.total)}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={columns.length + 2} className="px-3 py-8 text-center text-muted-foreground">
                Sin datos en el periodo.
              </td>
            </tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t bg-muted/30 font-medium">
              <td className="px-3 py-2">Total</td>
              {colTotals.map((v, i) => (
                <td key={i} className="px-3 py-2 text-right tabular whitespace-nowrap">
                  {v ? formatMoney(v) : "—"}
                </td>
              ))}
              <td className="px-3 py-2 text-right tabular whitespace-nowrap">{formatMoney(grand)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export type TopRow = {
  id: string;
  numero: number;
  cliente: string;
  asesor: string;
  estado: string;
  probabilidad: string;
  total: number;
};

export function TopTable({ rows }: { rows: TopRow[] }) {
  const total = rows.reduce((s, r) => s + r.total, 0);
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-3 py-2 font-medium">N°</th>
            <th className="px-3 py-2 font-medium">Cliente</th>
            <th className="px-3 py-2 font-medium">Asesor</th>
            <th className="px-3 py-2 font-medium">Estado</th>
            <th className="px-3 py-2 font-medium">Probabilidad</th>
            <th className="px-3 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
              <td className="px-3 py-2">
                <Link href={`/cotizaciones/${r.id}`} className="text-primary hover:underline">
                  {r.numero}
                </Link>
              </td>
              <td className="px-3 py-2">{r.cliente}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.asesor}</td>
              <td className="px-3 py-2">
                <Badge variant={quoteEstadoVariant(r.estado)}>{r.estado}</Badge>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{r.probabilidad}</td>
              <td className="px-3 py-2 text-right tabular font-medium whitespace-nowrap">
                {formatMoney(r.total)}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                Sin cotizaciones en el periodo.
              </td>
            </tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t bg-muted/30 font-medium">
              <td colSpan={5} className="px-3 py-2">
                Total
              </td>
              <td className="px-3 py-2 text-right tabular whitespace-nowrap">{formatMoney(total)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
