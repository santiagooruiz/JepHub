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
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("view", "quotes");
  const { id } = await params;

  const q = await db.quote.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    include: quoteDocInclude,
  });
  if (!q) notFound();

  return (
    <div className="mx-auto max-w-3xl p-6 print:max-w-none print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>
      <QuoteDocument q={mapQuoteToDoc(q)} />
    </div>
  );
}
