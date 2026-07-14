"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Pencil,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { downloadExcel } from "@/lib/export";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { exportErpClients } from "./actions";
import { type ErpClientRow, type ErpClientStats, estadoVariant } from "./types";

const STATS: { key: keyof ErpClientStats; label: string }[] = [
  { key: "total", label: "Total" },
  { key: "empresas", label: "Empresas" },
  { key: "personas", label: "Personas" },
  { key: "prospectos", label: "Prospectos" },
];

// Encabezados de la tabla; sortKey debe existir en el whitelist del servidor.
const COLUMNS: { label: string; sortKey: string | null }[] = [
  { label: "Nombre", sortKey: "nombre" },
  { label: "Documento", sortKey: "documento" },
  { label: "Tipo", sortKey: null },
  { label: "Email", sortKey: "email" },
  { label: "Teléfono", sortKey: "telefono" },
  { label: "Ciudad", sortKey: "ciudad" },
  { label: "Asesor", sortKey: "asesor" },
  { label: "Estado", sortKey: "estado" },
  { label: "Fecha registro", sortKey: "fechaRegistro" },
];

export function ErpClientsTable({
  rows,
  total,
  page,
  pageSize,
  q,
  tipo,
  sort,
  dir,
  ciudad,
  asesor,
  ciudades,
  asesores,
  stats,
  canEdit,
}: {
  rows: ErpClientRow[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  /** Filtro activo de las tarjetas (empresas/personas/prospectos) o null. */
  tipo: string | null;
  /** Ordenamiento activo (columna del whitelist) o null. */
  sort: string | null;
  dir: "asc" | "desc";
  /** Filtros de select activos. */
  ciudad: string | null;
  asesor: string | null;
  /** Opciones de los selects; `asesores` vacío = ocultar (solo admin lo recibe). */
  ciudades: string[];
  asesores: { codven: string; nombre: string }[];
  stats: ErpClientStats;
  /** Muestra el lápiz de edición por fila (permiso clients.edit). */
  canEdit: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [term, setTerm] = React.useState(q);
  const [pending, startTransition] = React.useTransition();
  const [exporting, startExport] = React.useTransition();
  const firstRun = React.useRef(true);

  const navigate = React.useCallback(
    (next: {
      q?: string;
      page?: number;
      tipo?: string | null;
      sort?: string | null;
      dir?: string;
      ciudad?: string | null;
      asesor?: string | null;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      const setOrDelete = (key: string, value: string | null | undefined) => {
        if (value === undefined) return;
        if (value) params.set(key, value);
        else params.delete(key);
      };
      setOrDelete("q", next.q);
      setOrDelete("tipo", next.tipo);
      setOrDelete("sort", next.sort);
      setOrDelete("ciudad", next.ciudad);
      setOrDelete("asesor", next.asesor);
      if (next.dir !== undefined) params.set("dir", next.dir);
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

      {/* Buscador + filtros + exportar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar por nombre, NIT o email…"
              className="pl-8"
            />
          </div>
          <SearchableSelect
            value={ciudad ?? ""}
            onChange={(v) => navigate({ ciudad: v || null, page: 1 })}
            options={ciudades}
            placeholder="Todas las ciudades"
            className="w-52"
            aria-label="Filtrar por ciudad"
          />
          {asesores.length > 0 && (
            <SearchableSelect
              value={asesor ?? ""}
              onChange={(v) => navigate({ asesor: v || null, page: 1 })}
              options={asesores.map((a) => ({ value: a.codven, label: a.nombre }))}
              placeholder="Todos los asesores"
              className="w-52"
              aria-label="Filtrar por asesor"
            />
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={exporting}
          onClick={() =>
            startExport(async () => {
              // Exporta TODO el set filtrado (no solo la página visible).
              const res = await exportErpClients({
                q,
                tipo: tipo ?? undefined,
                ciudad: ciudad ?? undefined,
                asesor: asesor ?? undefined,
                sort: sort ?? undefined,
                dir,
              });
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              downloadExcel(
                "clientes",
                COLUMNS.map((c) => c.label),
                (res.rows ?? []).map((r) => [
                  r.nombre,
                  r.nit,
                  r.tipo,
                  r.email,
                  r.telefono,
                  r.ciudad,
                  r.asesor,
                  r.estado,
                  r.fechaRegistro,
                ])
              );
            })
          }
        >
          <Download className="size-4" /> {exporting ? "Exportando…" : "Excel"}
        </Button>
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
              {COLUMNS.map((col) => (
                <th
                  key={col.label}
                  className="whitespace-nowrap px-3 font-medium"
                  style={{ height: "var(--row-h)" }}
                >
                  {col.sortKey ? (
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() =>
                        navigate({
                          sort: col.sortKey,
                          dir: sort === col.sortKey && dir === "asc" ? "desc" : "asc",
                          page: 1,
                        })
                      }
                    >
                      {col.label}
                      <ArrowUpDown
                        className={cn(
                          "size-3",
                          sort === col.sortKey ? "opacity-100" : "opacity-50"
                        )}
                      />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
              {/* Acciones (fuera de COLUMNS: ese array alimenta el export a Excel) */}
              <th className="px-3" style={{ height: "var(--row-h)" }} />
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
                  <td className="px-3 align-middle" style={cellPy}>
                    {c.nit && (
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/clientes/${encodeURIComponent(c.nit)}`}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                          aria-label="Ver"
                        >
                          <Eye className="size-4" />
                        </Link>
                        {canEdit && (
                          <Link
                            href={`/clientes/${encodeURIComponent(c.nit)}/editar`}
                            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                            aria-label="Editar"
                          >
                            <Pencil className="size-4" />
                          </Link>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">
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
