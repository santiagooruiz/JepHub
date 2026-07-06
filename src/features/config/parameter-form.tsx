"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveParameter } from "./actions";

export function ParameterForm({
  editing,
}: {
  editing?: { id: string; key: string; value: string };
}) {
  const router = useRouter();
  const [key, setKey] = React.useState(editing?.key ?? "");
  const [value, setValue] = React.useState(editing?.value ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    setKey(editing?.key ?? "");
    setValue(editing?.value ?? "");
  }, [editing]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveParameter({ id: editing?.id, key, value });
      if (res.ok) {
        toast.success(editing ? "Parámetro modificado" : "Parámetro registrado");
        router.push("/configuracion/parametros");
        router.refresh();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  function format() {
    try {
      setValue(JSON.stringify(JSON.parse(value), null, 2));
      setError(null);
    } catch {
      setError("El valor no es un JSON válido.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Clave</label>
        <Input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="ej. approved_types"
          disabled={!!editing}
          required
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Valor (JSON)</label>
          <button
            type="button"
            onClick={format}
            className="text-xs text-primary hover:underline"
          >
            Formatear
          </button>
        </div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={12}
          spellCheck={false}
          placeholder='[{ "id": "1", "value": "APROBADO", "color": "green" }]'
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {editing ? "Guardar cambios" : "Registrar"}
        </Button>
        {editing && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/configuracion/parametros")}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
