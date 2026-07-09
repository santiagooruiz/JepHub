import Link from "next/link";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { advisorScope } from "@/lib/scope";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { OrdersTable } from "@/features/orders/orders-table";
import { ORDER_ESTADOS, type OrderRow } from "@/features/orders/types";
import { clientDisplayName } from "@/features/clients/queries";
import { formatMoney } from "@/features/quotes/types";

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

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const user = await requirePermission("view", "orders");
  const canDelete = user.ability.can("delete", "orders");
  const sp = await searchParams;
  const estadoFilter =
    sp.estado && ORDER_ESTADOS.includes(sp.estado) ? sp.estado : null;

  // Alcance: un Asesor solo ve sus pedidos (advisorScope).
  const all = await db.order.findMany({
    where: { companyId: user.companyId, deletedAt: null, ...advisorScope(user) },
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

  const counts = ORDER_ESTADOS.map((e) => ({
    estado: e,
    n: all.filter((o) => o.estado === e).length,
  }));
  const filtered = estadoFilter
    ? all.filter((o) => o.estado === estadoFilter)
    : all;

  const rows: OrderRow[] = filtered.map((o) => ({
    id: o.id,
    numero: o.numero,
    cliente: clientDisplayName(o.client),
    asesor: o.advisor?.name ?? "",
    total: formatMoney(Number(o.total)),
    estado: o.estado,
    tipoProducto: o.tipoProducto,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Pedidos</h1>

      <div
        className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
        style={{ gap: "var(--card-gap)" }}
      >
        <FilterCard
          href="/pedidos"
          label="Todos"
          n={all.length}
          active={!estadoFilter}
        />
        {counts.map((c) => (
          <FilterCard
            key={c.estado}
            href={`/pedidos?estado=${encodeURIComponent(c.estado)}`}
            label={c.estado}
            n={c.n}
            active={estadoFilter === c.estado}
          />
        ))}
      </div>

      <OrdersTable data={rows} canDelete={canDelete} />
    </div>
  );
}
