import {
  ClipboardCheck,
  Wallet,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

import { Card } from "@/components/ui/card";

// Datos de ejemplo (anonimizados) — se conectarán en sprints posteriores.
const KPIS = [
  {
    label: "Cotizaciones activas",
    sub: "06-2026",
    value: "120",
    icon: ClipboardCheck,
    tile: "bg-rose-500",
  },
  {
    label: "$ Cotizaciones",
    sub: "06-2026",
    value: "$3.133,67 M",
    icon: Wallet,
    tile: "bg-amber-500",
  },
  {
    label: "Cant. Pedidos",
    sub: "En curso",
    value: "7.169",
    icon: ShoppingCart,
    tile: "bg-emerald-500",
  },
  {
    label: "$ Pedidos",
    sub: "En curso",
    value: "$51.674,84 M",
    icon: TrendingUp,
    tile: "bg-indigo-500",
  },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bienvenido a JEP&nbsp;Hub
        </h1>
        <p className="text-sm text-muted-foreground">
          Panel principal · datos de ejemplo (Sprint 0)
        </p>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        style={{ gap: "var(--card-gap)" }}
      >
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="flex items-center gap-4 p-4">
              <div
                className={`flex size-12 shrink-0 items-center justify-center rounded-lg text-white ${kpi.tile}`}
              >
                <Icon className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-muted-foreground">
                  {kpi.label}
                </p>
                <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                <p className="tabular mt-0.5 text-xl font-bold">{kpi.value}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 flex h-72 items-center justify-center border-dashed">
        <p className="text-sm text-muted-foreground">
          Aquí irán el gráfico de probabilidad de cierre y la tabla de
          cotizaciones (próximos sprints).
        </p>
      </Card>
    </div>
  );
}
