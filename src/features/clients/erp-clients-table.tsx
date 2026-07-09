"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { type ErpClientRow, type ErpClientStats, estadoVariant } from "./types";

const STATS: { key: keyof ErpClientStats; label: string }[] = [
  { key: "total", label: "Total" },
  { key: "empresas", label: "Empresas" },
  { key: "personas", label: "Personas" },
  { key: "prospectos", label: "Prospectos" },
];

export function ErpClientsTable({
  rows,
  total,
  page,
  pageSize,
  q,
  tipo,
  stats,
}: {
  rows: ErpClientRow[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  /** Filtro activo de las tarjetas (empresas/personas/prospectos) o null. */
  tipo: string | null;
  stats: ErpClientStats;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [term, setTerm] = React.useState(q);
  const [pending, startTransition] = React.useTransition();
  const firstRun = React.useRef(true);

  const navigate = React.useCallback(
    (next: { q?: string; page?: number; tipo?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.q !== undefined) {
        if (next.q) params.set("q", next.q);
        else params.delete("q");
      }
      if (next.tipo !== undefined) {
        if (next.tipo) params.set("tipo", next.tipo);
        else params.delete("tipo");
      }
      if (next.page !== undefined) params.set("page", String(next.page));
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [router, pathname, searchParams]
  );

  // Búsqueda con debounce → reinicia a la página 1.
  React.useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const id = setTimeout(() => navigate({ q: term, page: 1 }), 350);
    return () => clearTimeout(id);
  }, [term, navigate]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      {/* Resumen: tarjetas clicables que filtran la tabla por tipo. */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4"
        style={{ gap: "var(--card-gap)" }}
      >
        {STATS.map((s) => {
          // "Total" limpia el filtro; las demás filtran por su categoría.
          const value = s.key === "total" ? null : s.key;
          const active = tipo === value || (s.key === "total" && !tipo);
          return (
            <Card
              key={s.key}
              role="button"
              tabIndex={0}
              onClick={() => navigate({ tipo: active ? null : value, page: 1 })}
              onKeyDown={(e) =>
                e.key === "Enter" && navigate({ tipo: active ? null : value, page: 1 })
              }
              className={cn(
                "cursor-pointer p-3 transition-colors hover:border-primary/50",
                active &&
                  (s.key === "total"
                    ? "border-primary"
                    : "border-primary bg-primary text-primary-foreground")
              )}
            >
              <p
                className={cn(
                  "truncate text-sm",
                  active && s.key !== "total"
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground"
                )}
              >
                {s.label}
              </p>
              <p className="tabular mt-1 text-xl font-bold">
                {stats[s.key].toLocaleString("es-CO")}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Buscador */}
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por nombre, NIT o email…"
          className="pl-8"
        />
      </div>

      {/* Tabla */}
      <div
        className={cn(
          "overflow-x-auto rounded-lg border transition-opacity",
          pending && "opacity-60"
        )}
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {["Nombre", "Documento", "Tipo", "Email", "Teléfono", "Ciudad", "Asesor", "Estado", "Fecha registro"].map(
                (h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 font-medium"
                    style={{ height: "var(--row-h)" }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((c) => (
                <tr key={c.nit} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 align-middle font-medium" style={cellPy}>
                    {c.nit ? (
                      <Link
                        href={`/clientes/${encodeURIComponent(c.nit)}`}
                        className="text-primary hover:underline"
                      >
                        {c.nombre}
                      </Link>
                    ) : (
                      c.nombre
                    )}
                  </td>
                  <td className="tabular px-3 align-middle" style={cellPy}>
                    {c.nit || "—"}
                  </td>
                  <td className="px-3 align-middle" style={cellPy}>
                    <Badge variant="secondary">{c.tipo}</Badge>
                  </td>
                  <td className="px-3 align-middle text-muted-foreground" style={cellPy}>
                    {c.email || "—"}
                  </td>
                  <td className="px-3 align-middle text-muted-foreground" style={cellPy}>
                    {c.telefono || "—"}
                  </td>
                  <td className="px-3 align-middle text-muted-foreground" style={cellPy}>
                    {c.ciudad || "—"}
                  </td>
                  <td className="px-3 align-middle text-muted-foreground" style={cellPy}>
                    {c.asesor || "Sin asignar"}
                  </td>
                  <td className="px-3 align-middle" style={cellPy}>
                    <Badge variant={estadoVariant(c.estado)}>{c.estado}</Badge>
                  </td>
                  <td className="tabular px-3 align-middle text-muted-foreground" style={cellPy}>
                    {c.fechaRegistro || "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total > 0
            ? `${desde.toLocaleString("es-CO")}–${hasta.toLocaleString("es-CO")} de ${total.toLocaleString("es-CO")}`
            : "0 registros"}
        </span>
        <div className="flex items-center gap-2">
          <span>
            Página {page} de {totalPages.toLocaleString("es-CO")}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate({ page: page - 1 })}
            disabled={page <= 1 || pending}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate({ page: page + 1 })}
            disabled={page >= totalPages || pending}
            aria-label="Página siguiente"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

const cellPy: React.CSSProperties = {
  paddingTop: "var(--cell-py)",
  paddingBottom: "var(--cell-py)",
};
