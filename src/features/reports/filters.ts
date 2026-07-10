// Filtros de periodo compartidos entre el server (queries) y el cliente
// (filter-bar). Sin imports de servidor: filter-bar es un componente cliente
// y no debe arrastrar db/mssql al bundle.

export type Period = "month" | "quarter" | "year" | "all";

export const PERIODS: { id: Period; label: string }[] = [
  { id: "month", label: "Último mes" },
  { id: "quarter", label: "Último trimestre" },
  { id: "year", label: "Último año" },
  { id: "all", label: "Todo" },
];

export function periodFrom(period: Period): Date | null {
  const days = period === "month" ? 30 : period === "quarter" ? 90 : period === "year" ? 365 : 0;
  if (!days) return null;
  return new Date(Date.now() - days * 86400000);
}

export function parsePeriod(v?: string): Period {
  return v === "month" || v === "quarter" || v === "year" || v === "all" ? v : "year";
}
