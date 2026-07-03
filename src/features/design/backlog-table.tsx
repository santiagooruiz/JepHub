"use client";

import * as React from "react";
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

/**
 * Descripción con secciones PR-DI-01 y "Leer más" expandible, como el CRM
 * original: colapsada muestra solo DATOS DE ENTRADA (2 líneas).
 */
function DescripcionCell({ row }: { row: BacklogRow }) {
  const [open, setOpen] = React.useState(false);
  const secciones = [
    { label: "DATOS DE ENTRADA", text: row.datosEntrada },
    { label: "REQUISITOS TÉCNICOS", text: row.requisitosTecnicos },
  ].filter((s) => s.text);

  if (!secciones.length) {
    return (
      <span className="line-clamp-2 max-w-xs text-muted-foreground">
        {row.descripcion || "—"}
      </span>
    );
  }

  const visibles = open ? secciones : secciones.slice(0, 1);
  const expandible = secciones.length > 1 || secciones[0].text.length > 90;

  return (
    <div className="max-w-xs space-y-1.5">
      {visibles.map((s) => (
        <div key={s.label}>
          <p className="text-xs font-semibold">{s.label}:</p>
          <p
            className={
              open
                ? "whitespace-pre-wrap text-muted-foreground"
                : "line-clamp-2 text-muted-foreground"
            }
          >
            {s.text}
          </p>
        </div>
      ))}
      {expandible && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {open ? "Leer menos" : "Leer más"}
        </button>
      )}
    </div>
  );
}

export function BacklogTable({
  data,
  detailHrefBase,
}: {
  data: BacklogRow[];
  /** Prefijo del enlace del 👁️ (drawer de detalle); se le concatena el id. */
  detailHrefBase: string;
}) {
  const columns: ColumnDef<BacklogRow>[] = [
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) => {
        const { quoteId, orderId, tipo, origenEstado } = row.original;
        const href = orderId
          ? `/pedidos/${orderId}`
          : quoteId
            ? `/cotizaciones/${quoteId}`
            : null;
        return href ? (
          <div className="min-w-28">
            <Link href={href} className="text-primary hover:underline">
              {tipo}
            </Link>
            {origenEstado && (
              <span className="block text-xs font-medium uppercase text-muted-foreground">
                {origenEstado}
              </span>
            )}
          </div>
        ) : (
          <Badge variant="secondary">INTERNO</Badge>
        );
      },
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
      id: "descripcion",
      // Incluye las secciones PR-DI-01 para que la búsqueda global las cubra.
      accessorFn: (r) =>
        [r.descripcion, r.datosEntrada, r.requisitosTecnicos].join(" "),
      header: "Descripción",
      cell: ({ row }) => <DescripcionCell row={row.original} />,
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
            href={`${detailHrefBase}${row.original.id}`}
            scroll={false}
            className="inline-flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20"
            aria-label="Ver detalle"
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
