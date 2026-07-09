"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ensureClientAnchor } from "@/features/clients/actions";
import { registerActivity } from "./actions";

const selectCls =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function RegisterActivity({
  entityType,
  entityId,
  acciones,
  anchor,
}: {
  entityType: "CLIENT" | "OPPORTUNITY" | "QUOTE" | "ORDER";
  /** Id del registro (cuid). Opcional si se pasa `anchor` (cliente del ERP). */
  entityId?: string;
  acciones: string[];
  /** Cliente del ERP: crea/resuelve el ancla por NIT antes de registrar. */
  anchor?: { nit: string; nombre: string; esEmpresa: boolean };
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
      let id = entityId;
      // Cliente del ERP: asegura el ancla en PostgreSQL (por NIT) y usa su id.
      if (anchor) {
        const a = await ensureClientAnchor({
          nit: anchor.nit,
          nombre: anchor.nombre,
          esEmpresa: anchor.esEmpresa,
        });
        if (!a.ok) {
          setError(a.error);
          toast.error(a.error);
          return;
        }
        if (!a.clientId) {
          setError("No se pudo relacionar el cliente.");
          return;
        }
        id = a.clientId;
      }
      if (!id) {
        setError("Falta el cliente.");
        return;
      }
      const res = await registerActivity({
        entityType,
        entityId: id,
        accion,
        fechaHora,
        observaciones: obs,
      });
      if (res.ok) {
        toast.success("Actividad registrada");
        setAccion("");
        setFechaHora("");
        setObs("");
        router.refresh();
      } else {
        setError(res.error);
        toast.error(res.error);
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
