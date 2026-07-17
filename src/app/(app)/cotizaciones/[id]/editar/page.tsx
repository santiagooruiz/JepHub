import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { isAsesor } from "@/lib/auth";
import { quoteScope } from "@/lib/scope";
import { getQuoteOptions } from "@/features/quotes/queries";
import { parseAcabadosJson } from "@/features/quotes/line-items";
import { QuoteBuilder, type QuoteEditing } from "@/features/quotes/quote-builder";

export const dynamic = "force-dynamic";

export default async function EditarCotizacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("edit", "quotes");
  const { id } = await params;

  // Alcance: un Asesor no puede editar cotizaciones ajenas (404).
  const q = await db.quote.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null, ...quoteScope(user) },
    include: { items: { orderBy: [{ posicion: "asc" }, { id: "asc" }] } },
  });
  if (!q) notFound();

  const options = await getQuoteOptions(
    user.companyId,
    isAsesor(user) ? { advisorId: user.id } : undefined
  );
  const editing: QuoteEditing = {
    id: q.id,
    clientId: q.clientId,
    opportunityId: q.opportunityId,
    estado: q.estado,
    formaPago: q.formaPago,
    tiempoEntrega: q.tiempoEntrega,
    ordenCompra: q.ordenCompra,
    direccionEnvio: q.direccionEnvio,
    observacion: q.observacion,
    fechaVencimiento: q.fechaVencimiento
      ? q.fechaVencimiento.toISOString().slice(0, 10)
      : null,
    items: q.items.map((it) => ({
      id: it.id,
      tipo: it.tipo,
      parentId: it.parentId,
      productId: it.productId,
      referencia: it.referencia,
      descripcion: it.descripcion,
      precio: Number(it.precio),
      cantidad: it.cantidad,
      descuentoPct: Number(it.descuentoPct),
      acabados: it.acabados,
      acabadosSel: parseAcabadosJson(it.acabadosJson),
      esArea: it.esArea,
      largo: it.largo === null ? null : Number(it.largo),
      ancho: it.ancho === null ? null : Number(it.ancho),
      figura: it.figura,
    })),
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/cotizaciones/${q.id}`}
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Cotización N° {q.numero}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Editar cotización
      </h1>
      <QuoteBuilder options={options} editing={editing} />
    </div>
  );
}
