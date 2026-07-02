"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, Check, Minus, ImageIcon } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { type BacklogRow, backlogEstadoVariant } from "./types";

function Deliverable({ done }: { done: boolean }) {
  return done ? (
    <Check className="size-4 text-[hsl(var(--success))]" />
  ) : (
    <Minus className="size-4 text-muted-foreground/50" />
  );
}

export function BacklogTable({ data }: { data: BacklogRow[] }) {
  const columns: ColumnDef<BacklogRow>[] = [
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) =>
        row.original.quoteId ? (
          <Link
            href={`/cotizaciones/${row.original.quoteId}`}
            className="text-primary hover:underline"
          >
            {row.original.tipo}
          </Link>
        ) : (
          <Badge variant="secondary">INTERNO</Badge>
        ),
    },
    {
      id: "imagen",
      header: "",
      cell: ({ row }) =>
        row.original.imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.original.imagen}
            alt=""
            className="size-9 rounded object-cover"
          />
        ) : (
          <div className="flex size-9 items-center justify-center rounded bg-muted text-muted-foreground">
            <ImageIcon className="size-4" />
          </div>
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
      accessorKey: "fechaSolicitud",
      header: "Fecha solicitud",
      cell: ({ row }) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {row.original.fechaSolicitud}
        </span>
      ),
    },
    {
      accessorKey: "descripcion",
      header: "Descripción",
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-xs text-muted-foreground">
          {row.original.descripcion || "—"}
        </span>
      ),
    },
    {
      accessorKey: "nPedidoOfimatica",
      header: "N° pedido",
      cell: ({ row }) => (
        <span className="tabular text-muted-foreground">
          {row.original.nPedidoOfimatica || "—"}
        </span>
      ),
    },
    {
      accessorKey: "disenador",
      header: "Diseñador",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.disenador || "—"}</span>
      ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={backlogEstadoVariant(row.original.estado)}>
          {row.original.estado}
        </Badge>
      ),
    },
    {
      id: "despiece",
      header: "Despiece",
      cell: ({ row }) => <Deliverable done={row.original.despiece} />,
    },
    {
      id: "armado",
      header: "Armado",
      cell: ({ row }) => <Deliverable done={row.original.armadoGeneral} />,
    },
    {
      id: "planos",
      header: "Planos",
      cell: ({ row }) => <Deliverable done={row.original.planosTecnicos} />,
    },
    {
      id: "acciones",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Link
            href={`/backlog/${row.original.id}`}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            aria-label="Ver"
          >
            <Eye className="size-4" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <DataTable columns={columns} data={data} searchPlaceholder="Buscar en backlog…" />
  );
}
