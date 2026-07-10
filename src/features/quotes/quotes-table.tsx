"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Eye } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/features/config/delete-button";
import { deleteQuote } from "./actions";
import { type QuoteRow, quoteEstadoVariant } from "./types";

export function QuotesTable({
  data,
  canEdit,
  canDelete,
}: {
  data: QuoteRow[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const columns: ColumnDef<QuoteRow>[] = [
    {
      accessorKey: "numero",
      header: "No",
      cell: ({ row }) => (
        <span className="tabular text-muted-foreground">{row.original.numero}</span>
      ),
    },
    { accessorKey: "cliente", header: "Cliente" },
    {
      accessorKey: "oportunidad",
      header: "Oportunidad",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.oportunidad || "—"}</span>
      ),
    },
    {
      accessorKey: "registradoPor",
      header: "Registrado por",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.registradoPor || "—"}</span>
      ),
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => (
        <span className="tabular font-medium whitespace-nowrap">{row.original.total}</span>
      ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={quoteEstadoVariant(row.original.estado)}>
          {row.original.estado}
        </Badge>
      ),
    },
    {
      accessorKey: "fecha",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.fecha}</span>
      ),
    },
    {
      id: "acciones",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Link
            href={`/cotizaciones/${row.original.id}`}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            aria-label="Ver"
          >
            <Eye className="size-4" />
          </Link>
          {canEdit && (
            <Link
              href={`/cotizaciones/${row.original.id}/editar`}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              aria-label="Editar"
            >
              <Pencil className="size-4" />
            </Link>
          )}
          {canDelete && (
            <DeleteButton
              id={row.original.id}
              action={deleteQuote}
              confirmLabel="¿Archivar esta cotización?"
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Buscar cotización…"
      exportName="cotizaciones"
    />
  );
}
