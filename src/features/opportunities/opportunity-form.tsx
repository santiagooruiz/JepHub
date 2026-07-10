"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { saveOpportunity } from "./actions";
import type { OpportunityOptions } from "./queries";

export type OpportunityEditing = {
  id: string;
  clientId: string;
  nombre: string;
  contacto: string | null;
  cantidadPuestos: number | null;
  areaCubrir: number | null;
  observaciones: string | null;
  fechaCierreProyectada: string | null; // YYYY-MM-DD
};

const selectCls =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-[hsl(var(--destructive))]"> *</span>}
      </label>
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
  const [f, setF] = React.useState({
    clientId: editing?.clientId ?? defaultClientId ?? "",
    nombre: editing?.nombre ?? "",
    contacto: editing?.contacto ?? "",
    cantidadPuestos: editing?.cantidadPuestos?.toString() ?? "",
    areaCubrir: editing?.areaCubrir?.toString() ?? "",
    observaciones: editing?.observaciones ?? "",
    fechaCierreProyectada: editing?.fechaCierreProyectada ?? "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const clientContacts = f.clientId
    ? options.contacts.filter((c) => c.clientId === f.clientId)
    : [];
  const contactLabel = (c: { nombre: string; cargo: string | null }) =>
    c.cargo ? `${c.nombre} - ${c.cargo}` : c.nombre;

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((p) => ({ ...p, [k]: v }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveOpportunity({
        id: editing?.id,
        ...f,
        cantidadPuestos:
          f.cantidadPuestos === "" ? null : Number(f.cantidadPuestos),
        areaCubrir: f.areaCubrir === "" ? null : Number(f.areaCubrir),
      });
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
          <Field label="Cliente" required className="sm:col-span-2">
            <select
              required
              value={f.clientId}
              onChange={(e) => {
                const clientId = e.target.value;
                // Al cambiar de cliente se limpia el contacto (pertenece al
                // cliente anterior). El asesor lo asigna el servidor.
                setF((p) => ({
                  ...p,
                  clientId,
                  contacto: clientId === p.clientId ? p.contacto : "",
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
          <Field label="Nombre de la oportunidad" required className="sm:col-span-2">
            <Input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} required />
          </Field>
          <Field label="Cantidad de puestos">
            <Input
              type="number"
              min={0}
              step={1}
              value={f.cantidadPuestos}
              onChange={(e) => set("cantidadPuestos", e.target.value)}
            />
          </Field>
          <Field label="Área a cubrir (m²)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={f.areaCubrir}
              onChange={(e) => set("areaCubrir", e.target.value)}
            />
          </Field>
          <Field label="Fecha de cierre proyectada" required>
            <input
              type="date"
              required
              value={f.fechaCierreProyectada ?? ""}
              onChange={(e) => set("fechaCierreProyectada", e.target.value)}
              className={selectCls}
            />
          </Field>
          <Field label="Contacto">
            <select
              value={f.contacto ?? ""}
              onChange={(e) => set("contacto", e.target.value)}
              className={selectCls}
              disabled={!f.clientId}
            >
              <option value="">Seleccione</option>
              {/* Valor guardado que ya no existe como contacto del cliente. */}
              {f.contacto &&
                !clientContacts.some((c) => c.nombre === f.contacto) && (
                  <option value={f.contacto}>{f.contacto}</option>
                )}
              {clientContacts.map((c, i) => (
                <option key={`${c.nombre}-${i}`} value={c.nombre}>
                  {contactLabel(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Observaciones" className="sm:col-span-2">
            <textarea
              rows={4}
              value={f.observaciones}
              onChange={(e) => set("observaciones", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
        </div>
      </Card>

      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {editing ? "Modificar" : "Guardar"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/oportunidades")}>
          Volver
        </Button>
      </div>
    </form>
  );
}
