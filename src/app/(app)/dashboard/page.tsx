import Link from "next/link";
import { ClipboardCheck, Wallet, ShoppingCart, TrendingUp, Users, Target, ArrowRight } from "lucide-react";

import { requireUser } from "@/lib/guard";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/features/reports/kpi";
import { getDashboard } from "@/features/reports/queries";
import { formatMoney } from "@/features/quotes/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const { kpis, attention } = await getDashboard(user.companyId);

  const KPIS = [
    { label: "Cotizaciones activas", value: String(kpis.cotizacionesActivas), icon: ClipboardCheck, tile: "bg-rose-500" },
    { label: "$ Cotizaciones activas", value: formatMoney(kpis.montoCotizaciones), icon: Wallet, tile: "bg-amber-500" },
    { label: "Pedidos en curso", value: String(kpis.pedidosEnCurso), icon: ShoppingCart, tile: "bg-emerald-500" },
    { label: "$ Pedidos en curso", value: formatMoney(kpis.montoPedidos), icon: TrendingUp, tile: "bg-indigo-500" },
    { label: "Clientes", value: String(kpis.clientes), icon: Users, tile: "bg-sky-500" },
    { label: "Oportunidades abiertas", value: String(kpis.oportunidadesAbiertas), icon: Target, tile: "bg-violet-500" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bienvenido a JEP&nbsp;Hub, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">Panel principal · datos en vivo</p>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
        style={{ gap: "var(--card-gap)" }}
      >
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} tile={k.tile} />
        ))}
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Requiere atención</h2>
        <div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
          style={{ gap: "var(--card-gap)" }}
        >
          {attention.map((group) => (
            <Card key={group.key} className="flex flex-col">
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-sm">{group.label}</CardTitle>
                <Badge variant={group.count ? "default" : "muted"}>{group.count}</Badge>
              </CardHeader>
              <div className="flex-1 px-4 pb-3">
                {group.items.length ? (
                  <ul className="space-y-1.5">
                    {group.items.map((it) => (
                      <li key={it.id}>
                        <Link
                          href={it.href}
                          className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{it.primary}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {it.secondary}
                            </span>
                          </span>
                          {it.amount != null && (
                            <span className="tabular shrink-0 text-xs font-medium">
                              {formatMoney(it.amount)}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-3 text-sm text-muted-foreground">
                    {group.count ? `${group.count} elemento(s).` : "Nada pendiente. 🎉"}
                  </p>
                )}
              </div>
              <Link
                href={group.href}
                className="flex items-center gap-1 border-t px-4 py-2 text-xs font-medium text-primary hover:underline"
              >
                Ver todo <ArrowRight className="size-3" />
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
