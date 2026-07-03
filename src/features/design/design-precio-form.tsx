"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateDesignPrecio } from "./actions";

/**
 * Formulario compacto del precio comercial (etapa "PT precio comercial"):
 * el equipo de diseño agrega el precio y este queda en el histórico.
 */
export function DesignPrecioForm({
  id,
  values,
}: {
  id: string;
  values: {
    precioVentaPublico: string;
    precioVentaDto: string;
    cantRequerida: string;
  };
}) {
  const router = useRouter();
  const [f, setF] = React.useState(values);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateDesignPrecio({
        id,
        precioVentaPublico: f.precioVentaPublico.trim() || null,
        precioVentaDto: f.precioVentaDto.trim() || null,
        cantRequerida: f.cantRequerida.trim() || null,
      });
      setMsg(res.ok ? "Guardado" : res.error);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-2 rounded-md border bg-muted/30 p-3">
      <p className="text-sm font-medium">Precio comercial</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Venta Público ($)</span>
          <Input
            type="number"
            min="0"
            value={f.precioVentaPublico}
            onChange={(e) => set("precioVentaPublico", e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Venta Dto ($)</span>
          <Input
            type="number"
            min="0"
            value={f.precioVentaDto}
            onChange={(e) => set("precioVentaDto", e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Cant. requerida</span>
          <Input
            type="number"
            min="0"
            step="1"
            value={f.cantRequerida}
            onChange={(e) => set("cantRequerida", e.target.value)}
          />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={pending} onClick={save}>
          Guardar precio
        </Button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}
