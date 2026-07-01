"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { registerActivity } from "./actions";

const selectCls =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function RegisterActivity({
  clientId,
  acciones,
}: {
  clientId: string;
  acciones: string[];
}) {
  const router = useRouter();
  const [accion, setAccion] = React.useState("");
  const [fechaHora, setFechaHora] = React.useState("");
  const [obs, setObs] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await registerActivity({
        clientId,
        accion,
        fechaHora,
        observaciones: obs,
      });
      if (res.ok) {
        setAccion("");
        setFechaHora("");
        setObs("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Acción <span className="text-[hsl(var(--destructive))]">*</span>
        </label>
        <select
          required
          value={accion}
          onChange={(e) => setAccion(e.target.value)}
          className={selectCls}
        >
          <option value="">Seleccione</option>
          {acciones.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Fecha y hora <span className="text-[hsl(var(--destructive))]">*</span>
        </label>
        <input
          required
          type="datetime-local"
          value={fechaHora}
          onChange={(e) => setFechaHora(e.target.value)}
          className={selectCls}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Observaciones</label>
        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        Registrar
      </Button>
    </form>
  );
}
