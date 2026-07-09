"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { UserStatusToggle } from "./status-toggle";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  cargoActual: string | null;
  roleId: string | null;
  roleName: string | null;
  status: "ACTIVE" | "INACTIVE" | "PASSWORD_CHANGE";
};

export type RoleCard = { id: string; name: string; count: number };

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return <Badge variant="success">ACTIVO</Badge>;
  if (status === "PASSWORD_CHANGE") return <Badge variant="default">CAMBIO DE CONTRASEÑA</Badge>;
  return <Badge variant="muted">INACTIVO</Badge>;
}

export function UsersManager({
  roles,
  users,
  canEdit,
  currentUserId,
}: {
  roles: RoleCard[];
  users: UserRow[];
  canEdit: boolean;
  currentUserId: string;
}) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const filtered = selected ? users.filter((u) => u.roleId === selected) : users;

  return (
    <div>
      {/* Tarjetas por rol: cantidad de usuarios; clic para filtrar la tabla. */}
      <div
        className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        style={{ gap: "var(--card-gap)" }}
      >
        {roles.map((r) => {
          const active = selected === r.id;
          return (
            <Card
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(active ? null : r.id)}
              onKeyDown={(e) => e.key === "Enter" && setSelected(active ? null : r.id)}
              className={cn(
                "cursor-pointer p-3 transition-colors hover:border-primary/50",
                active && "border-primary bg-primary text-primary-foreground"
              )}
            >
              <p
                className={cn(
                  "truncate text-sm",
                  active ? "text-primary-foreground/80" : "text-muted-foreground"
                )}
                title={r.name}
              >
                {r.name}
              </p>
              <p className="tabular mt-1 text-lg font-bold">{r.count}</p>
            </Card>
          );
        })}
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setSelected(null)}
          onKeyDown={(e) => e.key === "Enter" && setSelected(null)}
          className={cn(
            "cursor-pointer p-3 transition-colors hover:border-primary/50",
            selected === null && "border-primary"
          )}
        >
          <p className="truncate text-sm text-muted-foreground">Total</p>
          <p className="tabular mt-1 text-lg font-bold">{users.length}</p>
        </Card>
      </div>

      {/* Tabla de usuarios (filtrada por el rol seleccionado). */}
      <Card className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Cargo</th>
              <th className="px-3 py-2 font-medium">Perfil</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              {canEdit && <th className="px-3 py-2 font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{u.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                <td className="px-3 py-2 text-muted-foreground">{u.cargoActual ?? "—"}</td>
                <td className="px-3 py-2">{u.roleName ?? "—"}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={u.status} />
                </td>
                {canEdit && (
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/configuracion/usuarios/${u.id}/editar`}
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                        aria-label="Editar usuario"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      {u.id === currentUserId ? (
                        <span className="text-xs text-muted-foreground">Tú</span>
                      ) : (
                        <UserStatusToggle userId={u.id} status={u.status} />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="px-3 py-8 text-center text-muted-foreground">
                  Sin usuarios en este rol.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
