import Link from "next/link";
import { Plus, Table as TableIcon, LayoutGrid } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { OpportunitiesTable } from "@/features/opportunities/opportunities-table";
import { KanbanBoard, type KanbanCard } from "@/features/opportunities/kanban-board";
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

function ViewToggle({ vista }: { vista: "tabla" | "kanban" }) {
  const base =
    "inline-flex h-9 items-center gap-1.5 px-3 text-sm font-medium transition-colors";
  return (
    <div className="inline-flex overflow-hidden rounded-md border">
      <Link
        href="/oportunidades"
        className={cn(base, vista === "tabla" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
      >
        <TableIcon className="size-4" /> Tabla
      </Link>
      <Link
        href="/oportunidades?vista=kanban"
        className={cn(base, "border-l", vista === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
      >
        <LayoutGrid className="size-4" /> Kanban
      </Link>
    </div>
  );
}

export default async function OportunidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; vista?: string }>;
}) {
  const user = await requirePermission("view", "opportunities");
  const canCreate = user.ability.can("create", "opportunities");
  const canEdit = user.ability.can("edit", "opportunities");
  const canDelete = user.ability.can("delete", "opportunities");
  const sp = await searchParams;
  const vista = sp.vista === "kanban" ? "kanban" : "tabla";
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

  const kanbanCards: KanbanCard[] = all.map((o) => ({
    id: o.id,
    numero: o.numero,
    nombre: o.nombre,
    cliente: clientDisplayName(o.client),
    asesor: o.advisor?.name ?? "",
    estado: o.estado,
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Oportunidades</h1>
        <div className="flex items-center gap-2">
          <ViewToggle vista={vista} />
          {canCreate && (
            <Button asChild>
              <Link href="/oportunidades/nuevo">
                <Plus className="size-4" /> Nueva
              </Link>
            </Button>
          )}
        </div>
      </div>

      {vista === "kanban" ? (
        <KanbanBoard cards={kanbanCards} canEdit={canEdit} />
      ) : (
        <>
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
          <OpportunitiesTable
            data={rows}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </>
      )}
    </div>
  );
}
