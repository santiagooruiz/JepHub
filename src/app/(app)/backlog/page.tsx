import Link from "next/link";
import { Plus } from "lucide-react";

import { requirePermission } from "@/lib/guard";
import { isStorageConfigured } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { listDesignRequests } from "@/features/design/queries";
import { BacklogTable } from "@/features/design/backlog-table";
import { BacklogDetailDrawer } from "@/features/design/backlog-detail-drawer";
import { BACKLOG_ESTADOS } from "@/features/design/types";

export const dynamic = "force-dynamic";

function FilterCard({
  href,
  label,
  n,
  active,
  tone,
}: {
  href: string;
  label: string;
  n: number;
  active: boolean;
  tone?: "danger" | "success";
}) {
  return (
    <Link href={href}>
      <Card
        className={cn(
          "p-3 transition-colors",
          active ? "border-primary bg-primary/5" : "hover:border-primary/40",
          tone === "danger" && "border-l-4 border-l-[hsl(var(--destructive))]",
          tone === "success" && "border-l-4 border-l-[hsl(var(--success))]"
        )}
      >
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        <p className="tabular mt-1 text-xl font-bold">{n}</p>
      </Card>
    </Link>
  );
}

export default async function BacklogPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; producto?: string; tab?: string }>;
}) {
  const user = await requirePermission("view", "backlog_design");
  const canCreate = user.ability.can("create", "backlog_design");
  const canEdit = user.ability.can("edit", "backlog_design");
  const sp = await searchParams;
  const estadoFilter =
    sp.estado && BACKLOG_ESTADOS.includes(sp.estado) ? sp.estado : null;

  // El 👁️ abre un panel lateral sobre el listado (?producto=…), preservando
  // el filtro de estado activo.
  const baseHref = estadoFilter
    ? `/backlog?estado=${encodeURIComponent(estadoFilter)}`
    : "/backlog";
  const detailHrefBase = `${baseHref}${estadoFilter ? "&" : "?"}producto=`;

  const all = await listDesignRequests(user.companyId);
  const counts = BACKLOG_ESTADOS.map((e) => ({
    estado: e,
    n: all.filter((r) => r.estado === e).length,
  }));
  const rows = estadoFilter ? all.filter((r) => r.estado === estadoFilter) : all;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Backlog Diseño
            {estadoFilter ? ` · ${estadoFilter}` : ""} ({rows.length})
          </h1>
          <p className="text-sm text-muted-foreground">
            Cola de diseño y desarrollo de producto (PR-DI-01)
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/backlog/nuevo">
              <Plus className="size-4" /> Nuevo producto
            </Link>
          </Button>
        )}
      </div>

      <div
        className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        style={{ gap: "var(--card-gap)" }}
      >
        <FilterCard href="/backlog" label="Todos" n={all.length} active={!estadoFilter} />
        {counts.map((c) => (
          <FilterCard
            key={c.estado}
            href={`/backlog?estado=${encodeURIComponent(c.estado)}`}
            label={c.estado}
            n={c.n}
            active={estadoFilter === c.estado}
            tone={
              c.estado === "Rechazados"
                ? "danger"
                : c.estado === "Finalizados"
                  ? "success"
                  : undefined
            }
          />
        ))}
      </div>

      <BacklogTable data={rows} detailHrefBase={detailHrefBase} />

      {sp.producto && (
        <BacklogDetailDrawer
          companyId={user.companyId}
          id={sp.producto}
          closeHref={baseHref}
          selfHref={`${detailHrefBase}${sp.producto}`}
          tab={sp.tab}
          canEdit={canEdit}
          canUpload={isStorageConfigured()}
        />
      )}
    </div>
  );
}
