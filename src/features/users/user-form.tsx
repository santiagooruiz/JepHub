"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
  codven: string | null;
  numeroTelefonico: string | null;
  status: "ACTIVE" | "INACTIVE" | "PASSWORD_CHANGE";
};

const selectCls =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
    codven: editing?.codven ?? "",
    numeroTelefonico: editing?.numeroTelefonico ?? "",
    status: editing?.status ?? "ACTIVE",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function set<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  // Si el codven guardado no está en la lista de asesores activos, se muestra igual.
  const codvenFaltante =
    !!f.codven && !options.asesores.some((a) => a.codven === f.codven);

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
            <select
              required
              value={f.roleId ?? ""}
              onChange={(e) => set("roleId", e.target.value)}
              className={selectCls}
            >
              <option value="">Seleccione</option>
              {options.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
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
          <Field label="Asesor del ERP (código vendedor)">
            <select
              value={f.codven ?? ""}
              onChange={(e) => set("codven", e.target.value)}
              className={selectCls}
            >
              <option value="">Ninguno</option>
              {codvenFaltante && (
                <option value={f.codven}>{f.codven} (actual)</option>
              )}
              {options.asesores.map((a) => (
                <option key={a.codven} value={a.codven}>
                  {a.nombre} ({a.codven})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select
              value={f.status}
              onChange={(e) => set("status", e.target.value as typeof f.status)}
              className={selectCls}
            >
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
              <option value="PASSWORD_CHANGE">Cambio de contraseña</option>
            </select>
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
