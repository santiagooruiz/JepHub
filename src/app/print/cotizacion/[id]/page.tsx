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
  searchParams: Promise<{ detalle?: string }>;
}) {
  const user = await requirePermission("view", "quotes");
  const { id } = await params;
  // Por defecto las carátulas se imprimen colapsadas (lo que ve el cliente);
  // ?detalle=1 lista además sus productos internos (impresión interna).
  const detalle = (await searchParams).detalle === "1";

  const q = await db.quote.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    include: quoteDocInclude,
  });
  if (!q) notFound();

  const tieneCaratulas = q.items.some((it) => it.tipo === "CARATULA");

  return (
    <div className="mx-auto max-w-3xl p-6 print:max-w-none print:p-0">
      <div className="mb-4 flex items-center justify-end gap-4 print:hidden">
        {tieneCaratulas && (
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
        <PrintButton />
      </div>
      <QuoteDocument q={mapQuoteToDoc(q, { detalleCaratulas: detalle })} />
    </div>
  );
}
