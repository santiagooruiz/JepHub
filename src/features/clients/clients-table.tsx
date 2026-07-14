"use client";

import * as React from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Eye, Download } from "lucide-react";

import { cn } from "@/lib/utils";
import { DataTable } from "@/components/data-table/data-table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteButton } from "@/features/config/delete-button";
import { deleteClient } from "./actions";
import { type ClientRow, estadoVariant } from "./types";

const EMBUDO: { estado: string; label: string }[] = [
  { estado: "Prospecto", label: "Prospectos" },
  { estado: "Gestión Cotización", label: "Gestión Cotización" },
  { estado: "Cliente", label: "Clientes" },
  { estado: "Gestión Perdida", label: "Gestión Perdidas" },
];

function exportCsv(rows: ClientRow[]) {
  const headers = [
    "Nombre",
    "Documento",
    "Tipo",
    "Email",
    "Teléfono",
    "Asesor",
    "Estado",
    "Última interacción",
    "Acción realizada",
    "Canal",
    "Fecha registro",
  ];
  const cell = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const lines = rows.map((r) =>
    [
      r.nombre,
      r.documento,
      r.tipo,
      r.email,
      r.telefono,
      r.asesor,
      r.estado,
      r.ultimaInteraccion,
      r.accion,
      r.canal,
      r.fechaRegistro,
    ]
      .map(cell)
      .join(";")
  );
  // BOM + ";" para que Excel es-CO abra las columnas correctamente
  const csv = "\uFEFF" + [headers.map(cell).join(";"), ...lines].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ClientsTable({
  data,
  canEdit,
  canDelete,
}: {
  data: ClientRow[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [estado, setEstado] = React.useState<string | null>(null);
  const [asesor, setAsesor] = React.useState("");

  const asesores = React.useMemo(
    () => [...new Set(data.map((r) => r.asesor).filter(Boolean))].sort(),
    [data]
  );
  const tieneSinAsignar = React.useMemo(
    () => data.some((r) => !r.asesor),
    [data]
  );

  const filtered = React.useMemo(
    () =>
      data.filter(
        (r) =>
          (!estado || r.estado === estado) &&
          (!asesor || (asesor === "__sin__" ? !r.asesor : r.asesor === asesor))
      ),
    [data, estado, asesor]
  );

  const count = (e: string) => data.filter((r) => r.estado === e).length;

  const columns: ColumnDef<ClientRow>[] = [
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: ({ row }) => (
        <Link
          href={`/clientes/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.nombre}
        </Link>
      ),
    },
    { accessorKey: "documento", header: "Documento" },
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) => <Badge variant="secondary">{row.original.tipo}</Badge>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email || "—"}</span>
      ),
    },
    {
      accessorKey: "telefono",
      header: "Teléfono",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.telefono || "—"}</span>
      ),
    },
    {
      accessorKey: "asesor",
      header: "Asesor",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.asesor || "Sin asignar"}
        </span>
      ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={estadoVariant(row.original.estado)}>
          {row.original.estado}
        </Badge>
      ),
    },
    {
      accessorKey: "ultimaInteraccion",
      header: "Última interacción",
      cell: ({ row }) => {
        const { ultimaInteraccion, dias } = row.original;
        if (!ultimaInteraccion)
          return <span className="text-muted-foreground">—</span>;
        return (
          <Badge variant={dias != null && dias > 30 ? "destructive" : "success"}>
            {ultimaInteraccion}
            {dias != null ? ` · ${dias} días` : ""}
          </Badge>
        );
      },
    },
    {
      accessorKey: "accion",
      header: "Acción realizada",
      cell: ({ row }) =>
        row.original.accion ? (
          <Badge variant="muted">{row.original.accion}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "canal",
      header: "Canal",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.canal || "—"}</span>
      ),
    },
    {
      accessorKey: "fechaRegistro",
      header: "Fecha registro",
      cell: ({ row }) => (
        <span className="tabular text-muted-foreground">
          {row.original.fechaRegistro}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Link
            href={`/clientes/${row.original.id}`}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            aria-label="Ver"
          >
            <Eye className="size-4" />
          </Link>
          {canEdit && (
            <Link
              href={`/clientes/${row.original.id}/editar`}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              aria-label="Editar"
            >
              <Pencil className="size-4" />
            </Link>
          )}
          {canDelete && (
            <DeleteButton
              id={row.original.id}
              action={deleteClient}
              confirmLabel="¿Eliminar este cliente?"
              successMessage="Cliente eliminado"
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Embudo: tarjetas clicables que filtran el listado */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        style={{ gap: "var(--card-gap)" }}
      >
        {EMBUDO.map((k) => {
          const active = estado === k.estado;
          return (
            <Card
              key={k.estado}
              role="button"
              tabIndex={0}
              onClick={() => setEstado(active ? null : k.estado)}
              onKeyDown={(e) =>
                e.key === "Enter" && setEstado(active ? null : k.estado)
              }
              className={cn(
                "cursor-pointer p-3 transition-colors hover:border-primary/50",
                active && "border-primary bg-primary text-primary-foreground"
              )}
            >
              <p
                className={cn(
                  "truncate text-sm",
                  active ? "text-primary-foreground/80" : "text-muted-foreground"
                )}
              >
                {k.label}
              </p>
              <p className="tabular mt-1 text-xl font-bold">{count(k.estado)}</p>
            </Card>
          );
        })}
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setEstado(null)}
          onKeyDown={(e) => e.key === "Enter" && setEstado(null)}
          className={cn(
            "cursor-pointer p-3 transition-colors hover:border-primary/50",
            estado === null && "border-primary"
          )}
        >
          <p className="truncate text-sm text-muted-foreground">Total</p>
          <p className="tabular mt-1 text-xl font-bold">{data.length}</p>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Buscar cliente…"
        toolbar={
          <div className="flex items-center gap-2">
            <SearchableSelect
              value={asesor}
              onChange={setAsesor}
              options={[
                ...asesores,
                ...(tieneSinAsignar ? [{ value: "__sin__", label: "Sin asignar" }] : []),
              ]}
              placeholder="Todos los asesores"
              className="w-52"
              aria-label="Filtrar por asesor"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportCsv(filtered)}
            >
              <Download className="size-4" /> CSV
            </Button>
          </div>
        }
      />
    </div>
  );
}
