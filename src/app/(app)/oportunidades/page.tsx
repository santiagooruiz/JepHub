import Link from "next/link";
import { Plus } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { OpportunitiesTable } from "@/features/opportunities/opportunities-table";
import { clientDisplayName } from "@/features/clients/queries";
import { OPP_ESTADOS, probLabel, type OppRow } from "@/features/opportunities/types";

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
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        <p className="tabular mt-1 text-xl font-bold">{n}</p>
      </Card>
    </Link>
  );
}

export default async function OportunidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const user = await requirePermission("view", "opportunities");
  const canCreate = user.ability.can("create", "opportunities");
  const canEdit = user.ability.can("edit", "opportunities");
  const canDelete = user.ability.can("delete", "opportunities");
  const sp = await searchParams;
  const estadoFilter =
    sp.estado && OPP_ESTADOS.includes(sp.estado) ? sp.estado : null;

  const all = await db.opportunity.findMany({
    where: { companyId: user.companyId, deletedAt: null },
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
      advisor: { select: { name: true } },
    },
    orderBy: { numero: "desc" },
  });

  const counts = OPP_ESTADOS.map((e) => ({
    estado: e,
    n: all.filter((o) => o.estado === e).length,
  }));
  const filtered = estadoFilter
    ? all.filter((o) => o.estado === estadoFilter)
    : all;

  const rows: OppRow[] = filtered.map((o) => ({
    id: o.id,
    numero: o.numero,
    nombre: o.nombre,
    cliente: clientDisplayName(o.client),
    asesor: o.advisor?.name ?? "",
    estado: o.estado,
    probabilidad: probLabel(o.probabilidad),
    fechaCierre: o.fechaCierreProyectada
      ? o.fechaCierreProyectada.toLocaleDateString("es-CO", {
          year: "numeric",
          month: "2-digit",
        })
      : "",
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Oportunidades</h1>
        {canCreate && (
          <Button asChild>
            <Link href="/oportunidades/nuevo">
              <Plus className="size-4" /> Nueva oportunidad
            </Link>
          </Button>
        )}
      </div>

      <div
        className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        style={{ gap: "var(--card-gap)" }}
      >
        <FilterCard
          href="/oportunidades"
          label="Todas"
          n={all.length}
          active={!estadoFilter}
        />
        {counts.map((c) => (
          <FilterCard
            key={c.estado}
            href={`/oportunidades?estado=${encodeURIComponent(c.estado)}`}
            label={c.estado}
            n={c.n}
            active={estadoFilter === c.estado}
          />
        ))}
      </div>

      <OpportunitiesTable data={rows} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}
