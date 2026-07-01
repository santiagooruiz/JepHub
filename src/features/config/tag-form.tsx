"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveTag } from "./actions";

export function TagForm({
  editing,
}: {
  editing?: { id: string; name: string };
}) {
  const router = useRouter();
  const [name, setName] = React.useState(editing?.name ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    setName(editing?.name ?? "");
  }, [editing]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveTag({ id: editing?.id, name });
      if (res.ok) {
        setName("");
        router.push("/configuracion/tags");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nombre del tag</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del tag"
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
            onClick={() => router.push("/configuracion/tags")}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
