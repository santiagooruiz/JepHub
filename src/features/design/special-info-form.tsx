"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { updateSpecial } from "./actions";
import { SPECIAL_ESTADOS } from "./types";

const TA =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export type SpecialFormValues = {
  id: string;
  codigo: string;
  tipo: string;
  descripcion: string;
  imagen: string;
  estado: string;
  precioVentaPublico: string;
  precioVentaDto: string;
  cantRequerida: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export function SpecialInfoForm({
  values,
  canEdit,
}: {
  values: SpecialFormValues;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [f, setF] = React.useState(values);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const set = (k: keyof SpecialFormValues, v: string) =>
    setF((p) => ({ ...p, [k]: v }));

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateSpecial({
        id: f.id,
        codigo: f.codigo,
        tipo: f.tipo || null,
        descripcion: f.descripcion || null,
        imagen: f.imagen || null,
        estado: f.estado,
        precioVentaPublico: f.precioVentaPublico === "" ? null : f.precioVentaPublico,
        precioVentaDto: f.precioVentaDto === "" ? null : f.precioVentaDto,
        cantRequerida: f.cantRequerida === "" ? null : f.cantRequerida,
      });
      setMsg(res.ok ? "Guardado" : res.error);
      if (res.ok) {
        toast.success("Ficha guardada");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  const ro = !canEdit;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Código especial">
          <Input value={f.codigo} disabled={ro} onChange={(e) => set("codigo", e.target.value)} />
        </Field>
        <Field label="Tipo">
          <Input value={f.tipo} disabled={ro} onChange={(e) => set("tipo", e.target.value)} />
        </Field>
        <Field label="Estado">
          {/* Un estado guardado fuera del catálogo se conserva: SearchableSelect
              lo antepone como opción. */}
          <SearchableSelect
            value={f.estado}
            disabled={ro}
            onChange={(v) => set("estado", v)}
            options={[...SPECIAL_ESTADOS]}
            clearable={false}
            aria-label="Estado"
          />
        </Field>
        <Field label="Imagen (URL)">
          <Input value={f.imagen} disabled={ro} onChange={(e) => set("imagen", e.target.value)} />
        </Field>
        <Field label="Precio venta público">
          <Input
            type="number"
            value={f.precioVentaPublico}
            disabled={ro}
            onChange={(e) => set("precioVentaPublico", e.target.value)}
          />
        </Field>
        <Field label="Precio venta Dto">
          <Input
            type="number"
            value={f.precioVentaDto}
            disabled={ro}
            onChange={(e) => set("precioVentaDto", e.target.value)}
          />
        </Field>
        <Field label="Cantidad requerida">
          <Input
            type="number"
            value={f.cantRequerida}
            disabled={ro}
            onChange={(e) => set("cantRequerida", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Descripción">
        <textarea
          rows={3}
          className={TA}
          disabled={ro}
          value={f.descripcion}
          onChange={(e) => set("descripcion", e.target.value)}
        />
      </Field>
      {canEdit && (
        <div className="flex items-center gap-2">
          <Button disabled={pending} onClick={save}>
            Guardar ficha
          </Button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      )}
    </div>
  );
}
