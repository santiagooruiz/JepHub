"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
        toast.success(editing ? "Categoría modificada" : "Categoría registrada");
        setName("");
        router.push("/configuracion/categorias");
        router.refresh();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Entidad</label>
        <SearchableSelect
          value={entity}
          onChange={setEntity}
          options={ENTITIES}
          clearable={false}
        />
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
