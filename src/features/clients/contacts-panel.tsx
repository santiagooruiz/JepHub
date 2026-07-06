"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveContact, deleteContact } from "./actions";

export type ContactItem = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  observacion: string | null;
};

type FormState = Omit<ContactItem, "id">;
const empty: FormState = {
  nombre: "",
  email: "",
  telefono: "",
  cargo: "",
  observacion: "",
};

export function ContactsPanel({
  clientId,
  contacts,
  canManage,
}: {
  clientId: string;
  contacts: ContactItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = React.useState<string | null>(null); // "new" | id | null
  const [form, setForm] = React.useState<FormState>(empty);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function openNew() {
    setEditingId("new");
    setForm(empty);
    setError(null);
  }
  function openEdit(c: ContactItem) {
    setEditingId(c.id);
    setForm({
      nombre: c.nombre,
      email: c.email ?? "",
      telefono: c.telefono ?? "",
      cargo: c.cargo ?? "",
      observacion: c.observacion ?? "",
    });
    setError(null);
  }
  function close() {
    setEditingId(null);
    setError(null);
  }
  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveContact({
        id: editingId === "new" ? undefined : editingId,
        clientId,
        ...form,
      });
      if (res.ok) {
        toast.success(
          editingId === "new" ? "Contacto añadido" : "Contacto modificado"
        );
        close();
        router.refresh();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }
  function remove(id: string) {
    if (!window.confirm("¿Eliminar contacto?")) return;
    start(async () => {
      const res = await deleteContact(id);
      if (res.ok) {
        toast.success("Contacto eliminado");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Contactos internos</h3>
        {canManage && editingId === null && (
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="size-4" /> Añadir
          </Button>
        )}
      </div>

      {editingId !== null && (
        <form onSubmit={submit} className="space-y-2 rounded-md border p-3">
          <Input placeholder="Nombre *" required value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
          <Input placeholder="Email" type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          <Input placeholder="Teléfono" value={form.telefono ?? ""} onChange={(e) => set("telefono", e.target.value)} />
          <Input placeholder="Cargo" value={form.cargo ?? ""} onChange={(e) => set("cargo", e.target.value)} />
          {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {editingId === "new" ? "Añadir" : "Guardar"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={close}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {contacts.map((c) => (
          <div key={c.id} className="rounded-md border p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{c.nombre}</span>
              {canManage && (
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent"
                    aria-label="Editar contacto"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    className="inline-flex size-7 items-center justify-center rounded text-[hsl(var(--destructive))] hover:bg-destructive/10"
                    aria-label="Eliminar contacto"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {c.cargo && <div>{c.cargo}</div>}
              {c.email && <div>{c.email}</div>}
              {c.telefono && <div>{c.telefono}</div>}
            </div>
          </div>
        ))}
        {!contacts.length && (
          <p className="text-sm text-muted-foreground">Sin contactos.</p>
        )}
      </div>
    </div>
  );
}
