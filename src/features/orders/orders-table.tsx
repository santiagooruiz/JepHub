"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/features/config/delete-button";
import { deleteOrder } from "./actions";
import { type OrderRow, orderEstadoVariant } from "./types";

export function OrdersTable({
  data,
  canDelete,
}: {
  data: OrderRow[];
  canDelete: boolean;
}) {
  const columns: ColumnDef<OrderRow>[] = [
    {
      accessorKey: "numero",
      header: "No",
      cell: ({ row }) => (
        <span className="tabular text-muted-foreground">{row.original.numero}</span>
      ),
    },
    { accessorKey: "cliente", header: "Cliente" },
    {
      accessorKey: "asesor",
      header: "Registrado por",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.asesor || "—"}</span>
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
        <Badge variant={orderEstadoVariant(row.original.estado)}>
          {row.original.estado}
        </Badge>
      ),
    },
    {
      accessorKey: "tipoProducto",
      header: "Tipo",
      cell: ({ row }) => <Badge variant="secondary">{row.original.tipoProducto}</Badge>,
    },
    {
      id: "acciones",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Link
            href={`/pedidos/${row.original.id}`}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            aria-label="Ver"
          >
            <Eye className="size-4" />
          </Link>
          {canDelete && (
            <DeleteButton
              id={row.original.id}
              action={deleteOrder}
              confirmLabel="¿Archivar este pedido?"
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
      searchPlaceholder="Buscar pedido…"
      exportName="pedidos"
    />
  );
}
