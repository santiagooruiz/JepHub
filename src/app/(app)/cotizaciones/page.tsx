import Link from "next/link";
import { Plus } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { quoteScope } from "@/lib/scope";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { QuotesTable } from "@/features/quotes/quotes-table";
import { clientDisplayName } from "@/features/clients/queries";
import { QUOTE_ESTADOS, formatMoney, type QuoteRow } from "@/features/quotes/types";

export const dynamic = "force-dynamic";

function FilterCard({
  href,
  label,
  n,
  active,
}: {
  href: string;
  label: string;
  n: number;
  active: boolean;
}) {
  return (
    <Link href={href}>
      <Card
        className={cn(
          "p-3 transition-colors",
          active ? "border-primary bg-primary/5" : "hover:border-primary/40"
        )}
      >
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="tabular mt-1 text-lg font-bold">{n}</p>
      </Card>
    </Link>
  );
}

export default async function CotizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const user = await requirePermission("view", "quotes");
  const canCreate = user.ability.can("create", "quotes");
  const canEdit = user.ability.can("edit", "quotes");
  const canDelete = user.ability.can("delete", "quotes");
  const sp = await searchParams;
  const estadoFilter =
    sp.estado && QUOTE_ESTADOS.includes(sp.estado) ? sp.estado : null;

  // Alcance: un Asesor solo ve cotizaciones propias (quoteScope).
  const all = await db.quote.findMany({
    where: { companyId: user.companyId, deletedAt: null, ...quoteScope(user) },
    include: {
      client: {
        select: {
          personType: true,
          nombres: true,
          apellidos: true,
          razonSocial: true,
          nombreComercial: true,
        },
      },
      opportunity: { select: { nombre: true } },
      registeredBy: { select: { name: true } },
    },
    orderBy: { numero: "desc" },
  });

  const counts = QUOTE_ESTADOS.map((e) => ({
    estado: e,
    n: all.filter((q) => q.estado === e).length,
  }));
  const filtered = estadoFilter
    ? all.filter((q) => q.estado === estadoFilter)
    : all;

  const rows: QuoteRow[] = filtered.map((q) => ({
    id: q.id,
    numero: q.numero,
    cliente: clientDisplayName(q.client),
    oportunidad: q.opportunity?.nombre ?? "",
    registradoPor: q.registeredBy?.name ?? "",
    total: formatMoney(Number(q.total)),
    estado: q.estado,
    fecha: q.createdAt.toLocaleDateString("es-CO"),
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Cotizaciones</h1>
        {canCreate && (
          <Button asChild>
            <Link href="/cotizaciones/nuevo">
              <Plus className="size-4" /> Nueva cotización
            </Link>
          </Button>
        )}
      </div>

      <div
        className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        style={{ gap: "var(--card-gap)" }}
      >
        <FilterCard
          href="/cotizaciones"
          label="Todas"
          n={all.length}
          active={!estadoFilter}
        />
        {counts.map((c) => (
          <FilterCard
            key={c.estado}
            href={`/cotizaciones?estado=${encodeURIComponent(c.estado)}`}
            label={c.estado}
            n={c.n}
            active={estadoFilter === c.estado}
          />
        ))}
      </div>

      <QuotesTable data={rows} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}
