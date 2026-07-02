import { ClipboardCheck, Wallet, ShoppingCart, TrendingUp, Users, Building2 } from "lucide-react";

import { formatMoney } from "@/features/quotes/types";
import { KpiCard } from "./kpi";
import { ChartCard, MoneyPie, CountPie, MoneyBar, MultiLine, EstadoTreemap } from "./charts";
import { PivotTable, TopTable } from "./tables";
import type { biCotizaciones, biPedidos, biSeguimiento } from "./queries";

type Ctz = Awaited<ReturnType<typeof biCotizaciones>>;
type Ped = Awaited<ReturnType<typeof biPedidos>>;
type Seg = Awaited<ReturnType<typeof biSeguimiento>>;

const grid2 = "grid grid-cols-1 lg:grid-cols-2";
const gap = { gap: "var(--card-gap)" } as const;

export function BiCotizacionesBoard({ data }: { data: Ctz }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5" style={gap}>
        <KpiCard label="Cotizaciones" value={String(data.kpis.cotizaciones)} icon={ClipboardCheck} tile="bg-rose-500" />
        <KpiCard label="Total Cotizado" value={formatMoney(data.kpis.totalCotizado)} icon={Wallet} tile="bg-amber-500" />
        <KpiCard label="Convertidas a Pedido" value={String(data.kpis.convertidas)} icon={ShoppingCart} tile="bg-emerald-500" />
        <KpiCard label="Convertido a Pedido" value={formatMoney(data.kpis.convertidoTotal)} icon={TrendingUp} tile="bg-indigo-500" />
        <KpiCard label="Clientes" value={String(data.kpis.clientes)} icon={Users} tile="bg-sky-500" />
      </div>

      <div className={grid2} style={gap}>
        <ChartCard title="Tasa de conversión">
          <CountPie data={data.conversionPie} />
        </ChartCard>
        <ChartCard title="Participación por asesor">
          <MoneyPie data={data.participacionPie} />
        </ChartCard>
      </div>

      <ChartCard title="Cotizaciones por asesor (semanal)">
        <MultiLine data={data.seriesByWeek} keys={data.seriesKeys} />
      </ChartCard>

      <ChartCard title="Estado de cotizaciones ($)">
        <EstadoTreemap data={data.estadoData} />
      </ChartCard>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Etapa cotizaciones por asesor</h3>
        <PivotTable columns={data.pivot.columns} rows={data.pivot.rows} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Top cotizaciones</h3>
        <TopTable rows={data.top} />
      </div>
    </div>
  );
}

export function BiPedidosBoard({ data }: { data: Ped }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3" style={gap}>
        <KpiCard label="Total pedidos" value={formatMoney(data.kpis.totalPedidos)} icon={Wallet} tile="bg-amber-500" />
        <KpiCard label="Cantidad pedidos" value={String(data.kpis.cantidadPedidos)} icon={ShoppingCart} tile="bg-emerald-500" />
        <KpiCard label="Clientes" value={String(data.kpis.clientes)} icon={Users} tile="bg-sky-500" />
      </div>

      <div className={grid2} style={gap}>
        <ChartCard title="Pedidos por vendedor ($)">
          <MoneyBar data={data.porVendedor} horizontal />
        </ChartCard>
        <ChartCard title="Estado de pedidos">
          <CountPie data={data.estadoPie} />
        </ChartCard>
      </div>

      <ChartCard title="Top ciudades ($)">
        <MoneyBar data={data.topCiudades} />
      </ChartCard>
    </div>
  );
}

export function BiSeguimientoBoard({ data }: { data: Seg }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3" style={gap}>
        <KpiCard label="Cotizaciones en seguimiento" value={String(data.registros)} icon={ClipboardCheck} tile="bg-rose-500" />
        <KpiCard
          label="Total en seguimiento"
          value={formatMoney(data.probabilidadPie.reduce((s, d) => s + d.value, 0))}
          icon={Wallet}
          tile="bg-amber-500"
        />
        <KpiCard label="Asesores activos" value={String(data.participacionPie.length)} icon={Building2} tile="bg-violet-500" />
      </div>

      <div className={grid2} style={gap}>
        <ChartCard title="Probabilidad de cierre ($)">
          <MoneyPie data={data.probabilidadPie} />
        </ChartCard>
        <ChartCard title="Participación por asesor">
          <MoneyPie data={data.participacionPie} />
        </ChartCard>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Top cotizaciones</h3>
        <TopTable rows={data.top} />
      </div>
    </div>
  );
}
