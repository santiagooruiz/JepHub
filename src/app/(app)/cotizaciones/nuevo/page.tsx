import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requirePermission } from "@/lib/guard";
import { getQuoteOptions } from "@/features/quotes/queries";
import { QuoteBuilder } from "@/features/quotes/quote-builder";

export const dynamic = "force-dynamic";

export default async function NuevaCotizacionPage({
  searchParams,
}: {
  searchParams: Promise<{ oportunidadId?: string; clienteId?: string }>;
}) {
  const user = await requirePermission("create", "quotes");
  const options = await getQuoteOptions(user.companyId);
  const { oportunidadId, clienteId } = await searchParams;

  const opp = options.opportunities.find((o) => o.id === oportunidadId);
  const defaults = {
    opportunityId: opp?.id,
    clientId:
      opp?.clientId ??
      options.clients.find((c) => c.id === clienteId)?.id,
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/cotizaciones"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Cotizaciones
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Nueva cotización
      </h1>
      <QuoteBuilder options={options} defaults={defaults} />
    </div>
  );
}
