"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Eye, ImageIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { type SpecialCard, specialEstadoVariant } from "./types";

export function SpecialGrid({ items }: { items: SpecialCard[] }) {
  const [q, setQ] = React.useState("");
  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((s) =>
      [s.codigo, s.descripcion, s.tipo, s.asesor].some((v) =>
        v.toLowerCase().includes(t)
      )
    );
  }, [items, q]);

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar diseños especiales…"
          className="pl-8"
        />
      </div>

      {filtered.length ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
          style={{ gap: "var(--card-gap)" }}
        >
          {filtered.map((s) => (
            <Card key={s.id} className="flex flex-col overflow-hidden">
              <div className="flex h-40 items-center justify-center bg-muted">
                {s.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.imagen} alt={s.codigo} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="size-10 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{s.codigo}</span>
                  <Badge variant={specialEstadoVariant(s.estado)}>{s.estado}</Badge>
                </div>
                {s.tipo && (
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {s.tipo}
                  </span>
                )}
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {s.descripcion || "—"}
                </p>
                <div className="mt-auto flex items-center justify-between pt-2 text-sm">
                  <div className="text-muted-foreground">
                    <div>{s.asesor || "—"}</div>
                    <div className="text-xs">{s.fecha}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="tabular font-medium">{s.precio}</span>
                    <Link
                      href={`/especiales/${s.id}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Eye className="size-4" /> Ver
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Sin diseños especiales.
        </p>
      )}
    </div>
  );
}
