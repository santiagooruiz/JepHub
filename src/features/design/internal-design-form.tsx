"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createInternalDesign } from "./actions";

const TA =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

const PLANNING: { key: string; label: string }[] = [
  { key: "datosEntrada", label: "Datos de entrada" },
  { key: "requisitosTecnicos", label: "Requisitos técnicos" },
  { key: "requisitosFuncionales", label: "Requisitos funcionales y desempeño" },
  { key: "posiblesFallos", label: "Posibles aspectos a fallar" },
  { key: "requisitosLegales", label: "Requisitos legales y reglamentarios" },
  { key: "disenosPrevios", label: "Información de diseños previos (referentes)" },
];

export function InternalDesignForm() {
  const router = useRouter();
  const [f, setF] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createInternalDesign(f);
      if (res.ok) {
        toast.success("Diseño interno registrado");
        router.push(`/backlog/${res.id}`);
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Descripción">
          <Input value={f.descripcion ?? ""} onChange={(e) => set("descripcion", e.target.value)} />
        </Field>
        <Field label="Imagen (URL)">
          <Input value={f.imagen ?? ""} onChange={(e) => set("imagen", e.target.value)} />
        </Field>
      </div>

      {PLANNING.map((p) => (
        <Field key={p.key} label={p.label}>
          <textarea
            rows={2}
            className={TA}
            value={f[p.key] ?? ""}
            onChange={(e) => set(p.key, e.target.value)}
          />
        </Field>
      ))}

      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          Guardar
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/backlog")}>
          Cerrar
        </Button>
      </div>
    </form>
  );
}
