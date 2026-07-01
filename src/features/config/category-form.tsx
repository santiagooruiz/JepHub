"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveCategory } from "./actions";

const ENTITIES = ["client", "channel", "sector", "document_type", "file_type"];

export function CategoryForm({
  editing,
}: {
  editing?: { id: string; entity: string; name: string };
}) {
  const router = useRouter();
  const [entity, setEntity] = React.useState(editing?.entity ?? "client");
  const [name, setName] = React.useState(editing?.name ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    setEntity(editing?.entity ?? "client");
    setName(editing?.name ?? "");
  }, [editing]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveCategory({ id: editing?.id, entity, name });
      if (res.ok) {
        setName("");
        router.push("/configuracion/categorias");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Entidad</label>
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {ENTITIES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nombre</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la categoría"
          required
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
            onClick={() => router.push("/configuracion/categorias")}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
