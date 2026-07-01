"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Eye } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/features/config/delete-button";
import { deleteClient } from "./actions";
import { type ClientRow, estadoVariant } from "./types";

export function ClientsTable({
  data,
  canEdit,
  canDelete,
}: {
  data: ClientRow[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const columns: ColumnDef<ClientRow>[] = [
    {
      accessorKey: "numero",
      header: "No",
      cell: ({ row }) => (
        <span className="tabular text-muted-foreground">{row.original.numero}</span>
      ),
    },
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
        <span className="text-muted-foreground">{row.original.asesor || "—"}</span>
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
          <Badge variant={dias != null && dias > 30 ? "destructive" : "muted"}>
            {ultimaInteraccion}
            {dias != null ? ` · ${dias} días` : ""}
          </Badge>
        );
      },
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
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable columns={columns} data={data} searchPlaceholder="Buscar cliente…" />
  );
}
