import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { quoteDocInclude, mapQuoteToDoc } from "@/features/quotes/queries";
import { QuoteDocument } from "@/features/quotes/quote-document";
import { FirmaForm } from "@/features/quotes/firma-form";

export const dynamic = "force-dynamic";

export default async function FirmaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const sig = await db.signature.findUnique({
    where: { token },
    include: { quote: { include: quoteDocInclude } },
  });
  if (!sig || !sig.quote || sig.quote.deletedAt) notFound();

  const doc = mapQuoteToDoc(sig.quote);

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="mb-1 text-xl font-semibold tracking-tight">
          Aprobación de cotización
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Revisa el detalle y aprueba con tu firma.
        </p>

        <QuoteDocument q={doc} />

        <Card className="mt-6 p-4">
          {sig.estado === "firmada" ? (
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="size-6 text-[hsl(var(--success))]" />
              <div>
                <p className="font-medium">Cotización aprobada y firmada</p>
                <p className="text-muted-foreground">
                  Por {sig.firmanteNombre}
                  {sig.firmadaEn
                    ? ` · ${sig.firmadaEn.toLocaleString("es-CO")}`
                    : ""}
                </p>
              </div>
            </div>
          ) : sig.estado === "rechazada" ? (
            <div className="flex items-center gap-3 text-sm">
              <XCircle className="size-6 text-[hsl(var(--destructive))]" />
              <p className="font-medium">Cotización rechazada</p>
            </div>
          ) : (
            <FirmaForm token={token} />
          )}
        </Card>
      </div>
    </div>
  );
}
