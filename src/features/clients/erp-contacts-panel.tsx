"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { saveErpContact, deleteErpContact } from "./actions";
import { ERP_MAX_CONTACTS, type ErpClientContact } from "./types";

const empty: ErpClientContact = { nombre: "", cargo: "", email: "", telefono: "" };

/**
 * Contactos del cliente del ERP (MTPROCLI ZCONTAC1..4): máximo 4. Cuando el
 * cliente ya tiene los 4, se oculta "Añadir" y solo se puede editar/eliminar.
 */
export function ErpContactsPanel({
  nit,
  contacts,
  canManage,
}: {
  nit: string;
  contacts: ErpClientContact[];
  canManage: boolean;
}) {
  const router = useRouter();
  // "new" | índice del contacto en edición | null (sin formulario abierto).
  const [editing, setEditing] = React.useState<"new" | number | null>(null);
  const [form, setForm] = React.useState<ErpClientContact>(empty);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  const isFull = contacts.length >= ERP_MAX_CONTACTS;

  function openNew() {
    setEditing("new");
    setForm(empty);
    setError(null);
  }
  function openEdit(i: number) {
    setEditing(i);
    setForm(contacts[i]);
    setError(null);
  }
  function close() {
    setEditing(null);
    setError(null);
  }
  function set<K extends keyof ErpClientContact>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveErpContact({
        nit,
        index: editing === "new" ? undefined : editing ?? undefined,
        ...form,
      });
      if (res.ok) {
        toast.success(editing === "new" ? "Contacto añadido" : "Contacto modificado");
        close();
        router.refresh();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  function remove(index: number) {
    confirmDialog("¿Eliminar contacto?", () =>
      start(async () => {
        const res = await deleteErpContact({ nit, index });
        if (res.ok) {
          toast.success("Contacto eliminado");
          router.refresh();
        } else {
          toast.error(res.error);
        }
      })
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Contactos</h3>
        {canManage && editing === null && !isFull && (
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="size-4" /> Añadir
          </Button>
        )}
      </div>
      {isFull && canManage && (
        <p className="text-xs text-muted-foreground">
          Máximo {ERP_MAX_CONTACTS} contactos: para agregar otro, elimine uno existente.
        </p>
      )}

      {editing !== null && (
        <form onSubmit={submit} className="space-y-2 rounded-md border p-3">
          <Input placeholder="Nombre *" required maxLength={60} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
          <Input placeholder="Cargo" maxLength={60} value={form.cargo} onChange={(e) => set("cargo", e.target.value)} />
          <Input placeholder="Correo" type="email" maxLength={160} value={form.email} onChange={(e) => set("email", e.target.value)} />
          <Input placeholder="Teléfono" maxLength={30} value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
          {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {editing === "new" ? "Añadir" : "Guardar"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={close}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {contacts.map((c, i) => (
          <div key={i} className="rounded-md border p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{c.nombre}</span>
              {canManage && (
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(i)}
                    className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent"
                    aria-label="Editar contacto"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => remove(i)}
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
              {c.email && <div className="break-all">{c.email.toLowerCase()}</div>}
              {c.telefono && <div>{c.telefono}</div>}
            </div>
          </div>
        ))}
        {!contacts.length && <p className="text-sm text-muted-foreground">Sin contactos.</p>}
      </div>
    </div>
  );
}
