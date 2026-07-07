"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { saveOpportunity } from "./actions";
import { OPP_ESTADOS } from "./types";
import type { OpportunityOptions } from "./queries";

export type OpportunityEditing = {
  id: string;
  clientId: string;
  nombre: string;
  contacto: string | null;
  advisorId: string | null;
  estado: string;
  probabilidad: "UNDEFINED" | "HIGH" | "FIXED";
  fechaCierreProyectada: string | null; // YYYY-MM-DD
};

const selectCls =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

export function OpportunityForm({
  options,
  editing,
  defaultClientId,
}: {
  options: OpportunityOptions;
  editing?: OpportunityEditing;
  /** Cliente preseleccionado (creación desde la ficha del cliente). */
  defaultClientId?: string;
}) {
  const router = useRouter();
  const advisorOf = (clientId: string) =>
    options.clients.find((c) => c.id === clientId)?.advisorId ?? "";
  const [f, setF] = React.useState({
    clientId: editing?.clientId ?? defaultClientId ?? "",
    nombre: editing?.nombre ?? "",
    contacto: editing?.contacto ?? "",
    advisorId:
      editing?.advisorId ?? (defaultClientId ? advisorOf(defaultClientId) : ""),
    estado: editing?.estado ?? "No Cotizada",
    probabilidad: editing?.probabilidad ?? "UNDEFINED",
    fechaCierreProyectada: editing?.fechaCierreProyectada ?? "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((p) => ({ ...p, [k]: v }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveOpportunity({ id: editing?.id, ...f });
      if (res.ok) {
        toast.success(
          editing ? "Oportunidad modificada" : "Oportunidad registrada"
        );
        router.push("/oportunidades");
        router.refresh();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Cliente">
            <select
              required
              value={f.clientId}
              onChange={(e) => {
                const clientId = e.target.value;
                // Al elegir cliente se trae su asesor asignado (editable después).
                setF((p) => ({
                  ...p,
                  clientId,
                  advisorId: clientId ? advisorOf(clientId) : p.advisorId,
                }));
              }}
              className={selectCls}
            >
              <option value="">Seleccione</option>
              {options.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nombre de la oportunidad">
            <Input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} required />
          </Field>
          <Field label="Contacto">
            <Input value={f.contacto ?? ""} onChange={(e) => set("contacto", e.target.value)} />
          </Field>
          <Field label="Asesor">
            <select
              value={f.advisorId ?? ""}
              onChange={(e) => set("advisorId", e.target.value)}
              className={selectCls}
            >
              <option value="">Seleccione</option>
              {options.advisors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select
              value={f.estado}
              onChange={(e) => set("estado", e.target.value)}
              className={selectCls}
            >
              {OPP_ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Probabilidad de cierre">
            <select
              value={f.probabilidad}
              onChange={(e) =>
                set("probabilidad", e.target.value as typeof f.probabilidad)
              }
              className={selectCls}
            >
              <option value="UNDEFINED">Sin Definir</option>
              <option value="HIGH">Alta Probabilidad</option>
              <option value="FIXED">Fijo</option>
            </select>
          </Field>
          <Field label="Fecha de cierre proyectada">
            <input
              type="date"
              value={f.fechaCierreProyectada ?? ""}
              onChange={(e) => set("fechaCierreProyectada", e.target.value)}
              className={selectCls}
            />
          </Field>
        </div>
      </Card>

      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {editing ? "Modificar" : "Registrar"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/oportunidades")}>
          Volver
        </Button>
      </div>
    </form>
  );
}
