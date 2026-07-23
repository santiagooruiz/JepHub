import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import {
  quoteDocInclude,
  mapQuoteToDoc,
} from "@/features/quotes/queries";
import { QuoteDocument } from "@/features/quotes/quote-document";
import { PrintButton } from "@/features/quotes/print-button";

export const dynamic = "force-dynamic";

export default async function PrintQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vista?: string; detalle?: string }>;
}) {
  const user = await requirePermission("view", "quotes");
  const { id } = await params;
  // "caratula" (por defecto, lo que ve el cliente: carátulas colapsadas) o
  // "despiece" (todos los productos en su propia línea, sin carátulas ni
  // separadores; para producción/fábrica).
  const sp = await searchParams;
  const vista = sp.vista === "despiece" ? "despiece" : "caratula";
  // Solo aplica en vista carátula: lista además los productos internos.
  const detalle = sp.detalle === "1";

  const q = await db.quote.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    include: quoteDocInclude,
  });
  if (!q) notFound();

  const tieneCaratulas = q.items.some((it) => it.tipo === "CARATULA");
  const linkCls = (activo: boolean) =>
    `text-sm underline-offset-4 hover:underline ${
      activo ? "font-semibold text-foreground" : "text-muted-foreground"
    }`;

  return (
    <div className="mx-auto max-w-3xl p-6 print:max-w-none print:p-0">
      <div className="mb-4 flex items-center justify-end gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={`/print/cotizacion/${id}`}
            className={linkCls(vista === "caratula")}
          >
            Carátula
          </Link>
          <Link
            href={`/print/cotizacion/${id}?vista=despiece`}
            className={linkCls(vista === "despiece")}
          >
            Despiece
          </Link>
          {vista === "caratula" && tieneCaratulas && (
            <Link
              href={
                detalle
                  ? `/print/cotizacion/${id}`
                  : `/print/cotizacion/${id}?detalle=1`
              }
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {detalle
                ? "Ocultar desglose de carátulas"
                : "Ver desglose de carátulas"}
            </Link>
          )}
        </div>
        <PrintButton />
      </div>
      <QuoteDocument
        q={mapQuoteToDoc(q, {
          vista,
          detalleCaratulas: vista === "caratula" && detalle,
        })}
      />
    </div>
  );
}
