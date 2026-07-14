"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { saveUser } from "./actions";

export type UserFormOptions = {
  roles: { id: string; name: string }[];
  asesores: { codven: string; nombre: string }[];
};

export type UserEditing = {
  id: string;
  name: string;
  email: string;
  roleId: string | null;
  cargoActual: string | null;
  codvens: string[];
  numeroTelefonico: string | null;
  status: "ACTIVE" | "INACTIVE" | "PASSWORD_CHANGE";
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

export function UserForm({
  options,
  editing,
}: {
  options: UserFormOptions;
  editing?: UserEditing;
}) {
  const router = useRouter();
  const [f, setF] = React.useState({
    name: editing?.name ?? "",
    email: editing?.email ?? "",
    password: "",
    roleId: editing?.roleId ?? "",
    cargoActual: editing?.cargoActual ?? "",
    codvens: editing?.codvens ?? [],
    numeroTelefonico: editing?.numeroTelefonico ?? "",
    status: editing?.status ?? "ACTIVE",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function set<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCodven(cv: string) {
    setF((prev) => ({
      ...prev,
      codvens: prev.codvens.includes(cv)
        ? prev.codvens.filter((x) => x !== cv)
        : [...prev.codvens, cv],
    }));
  }

  // Codvens guardados que ya no están en la lista de asesores activos (se muestran igual).
  const asesorCodvens = new Set(options.asesores.map((a) => a.codven));
  const codvensFaltantes = f.codvens.filter((cv) => !asesorCodvens.has(cv));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveUser({ id: editing?.id, ...f });
      if (res.ok) {
        toast.success(editing ? "Usuario actualizado" : "Usuario creado");
        router.push("/configuracion/usuarios");
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
          <Field label="Nombre *">
            <Input required value={f.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Email *">
            <Input
              required
              type="email"
              value={f.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <Field label={editing ? "Contraseña (dejar en blanco para no cambiar)" : "Contraseña *"}>
            <Input
              type="password"
              required={!editing}
              minLength={6}
              value={f.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder={editing ? "••••••" : "Mínimo 6 caracteres"}
            />
          </Field>
          <Field label="Perfil (rol) *">
            <SearchableSelect
              value={f.roleId ?? ""}
              onChange={(v) => set("roleId", v)}
              options={options.roles.map((r) => ({ value: r.id, label: r.name }))}
            />
          </Field>
          <Field label="Cargo">
            <Input value={f.cargoActual} onChange={(e) => set("cargoActual", e.target.value)} />
          </Field>
          <Field label="Teléfono">
            <Input
              value={f.numeroTelefonico}
              onChange={(e) => set("numeroTelefonico", e.target.value)}
            />
          </Field>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium">
              Asesor del ERP (código vendedor)
            </label>
            <p className="text-xs text-muted-foreground">
              Marca uno o varios. Si el asesor maneja varias sedes (ej. EXTERIOR y
              LOCAL), al crear un cliente podrá elegir cuál usar.
            </p>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2">
              {codvensFaltantes.map((cv) => (
                <label key={cv} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked readOnly onClick={() => toggleCodven(cv)} />
                  <span>{cv} (código actual)</span>
                </label>
              ))}
              {options.asesores.map((a) => (
                <label key={a.codven} className="flex items-center gap-2 text-sm hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={f.codvens.includes(a.codven)}
                    onChange={() => toggleCodven(a.codven)}
                  />
                  <span>
                    {a.nombre} <span className="text-muted-foreground">({a.codven})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <Field label="Estado">
            <SearchableSelect
              value={f.status}
              onChange={(v) => set("status", v as typeof f.status)}
              options={[
                { value: "ACTIVE", label: "Activo" },
                { value: "INACTIVE", label: "Inactivo" },
                { value: "PASSWORD_CHANGE", label: "Cambio de contraseña" },
              ]}
              clearable={false}
            />
          </Field>
        </div>
      </Card>

      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {editing ? "Guardar cambios" : "Crear usuario"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/configuracion/usuarios")}
        >
          Volver
        </Button>
      </div>
    </form>
  );
}
