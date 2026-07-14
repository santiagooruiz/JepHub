"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Eye } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/features/config/delete-button";
import { deleteOpportunity } from "./actions";
import { MarkLostButton } from "./mark-lost-button";
import { type OppRow, oppEstadoVariant } from "./types";

export function OpportunitiesTable({
  data,
  canEdit,
  canDelete,
}: {
  data: OppRow[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const columns: ColumnDef<OppRow>[] = [
    {
      accessorKey: "numero",
      header: "No",
      cell: ({ row }) => (
        <span className="tabular text-muted-foreground">{row.original.numero}</span>
      ),
    },
    {
      accessorKey: "nombre",
      header: "Oportunidad",
      cell: ({ row }) => (
        <Link
          href={`/oportunidades/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.nombre}
        </Link>
      ),
    },
    { accessorKey: "cliente", header: "Cliente" },
    {
      accessorKey: "asesor",
      header: "Asesor",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.asesor || "—"}</span>
      ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={oppEstadoVariant(row.original.estado)}>
          {row.original.estado}
        </Badge>
      ),
    },
    {
      accessorKey: "probabilidad",
      header: "Probabilidad",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.probabilidad}</span>
      ),
    },
    {
      accessorKey: "fechaCierre",
      header: "Cierre proyectado",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.fechaCierre || "—"}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Link
            href={`/oportunidades/${row.original.id}`}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            aria-label="Ver"
          >
            <Eye className="size-4" />
          </Link>
          {canEdit && (
            <Link
              href={`/oportunidades/${row.original.id}/editar`}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              aria-label="Editar"
            >
              <Pencil className="size-4" />
            </Link>
          )}
          {canEdit && row.original.estado !== "Perdida" && (
            <MarkLostButton id={row.original.id} nombre={row.original.nombre} />
          )}
          {canDelete && (
            <DeleteButton
              id={row.original.id}
              action={deleteOpportunity}
              confirmLabel="¿Archivar esta oportunidad?"
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
      searchPlaceholder="Buscar oportunidad…"
      exportName="oportunidades"
    />
  );
}
