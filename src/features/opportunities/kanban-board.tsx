"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { updateOpportunityStage } from "./actions";
import { OPP_ESTADOS, oppEstadoVariant } from "./types";

export type KanbanCard = {
  id: string;
  numero: number;
  nombre: string;
  cliente: string;
  asesor: string;
  estado: string;
};

export function KanbanBoard({
  cards,
  canEdit,
}: {
  cards: KanbanCard[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(cards);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overCol, setOverCol] = React.useState<string | null>(null);
  const [, start] = React.useTransition();

  React.useEffect(() => setItems(cards), [cards]);

  const byEstado = (e: string) => items.filter((i) => i.estado === e);

  function onDrop(estado: string) {
    const id = dragId;
    setDragId(null);
    setOverCol(null);
    if (!id) return;
    const card = items.find((i) => i.id === id);
    if (!card || card.estado === estado) return;
    // Optimista
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, estado } : i)));
    start(async () => {
      const res = await updateOpportunityStage(id, estado);
      if (res.ok) {
        toast.success(`Oportunidad movida a ${estado}`);
      } else {
        setItems(cards); // revertir
        toast.error(res.error);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {OPP_ESTADOS.map((estado) => {
        const col = byEstado(estado);
        return (
          <div
            key={estado}
            onDragOver={
              canEdit
                ? (e) => {
                    e.preventDefault();
                    setOverCol(estado);
                  }
                : undefined
            }
            onDragLeave={canEdit ? () => setOverCol(null) : undefined}
            onDrop={canEdit ? () => onDrop(estado) : undefined}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors",
              overCol === estado && "border-primary bg-primary/5"
            )}
          >
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-medium">{estado}</span>
              <Badge variant={oppEstadoVariant(estado)}>{col.length}</Badge>
            </div>
            <div className="min-h-24 flex-1 space-y-2 p-2">
              {col.map((c) => (
                <div
                  key={c.id}
                  draggable={canEdit}
                  onDragStart={() => setDragId(c.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverCol(null);
                  }}
                  className={cn(
                    "rounded-md border bg-card p-3 text-sm shadow-sm",
                    canEdit && "cursor-grab active:cursor-grabbing",
                    dragId === c.id && "opacity-50"
                  )}
                >
                  <div className="text-xs text-muted-foreground">N° {c.numero}</div>
                  <Link
                    href={`/oportunidades/${c.id}`}
                    className="line-clamp-2 font-medium text-primary hover:underline"
                  >
                    {c.nombre}
                  </Link>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {c.cliente}
                    {c.asesor ? ` · ${c.asesor}` : ""}
                  </div>
                </div>
              ))}
              {col.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                  —
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
