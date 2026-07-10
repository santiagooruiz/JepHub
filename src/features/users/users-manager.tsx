"use client";

import * as React from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
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

const STATUS_LABEL: Record<UserRow["status"], string> = {
  ACTIVE: "ACTIVO",
  INACTIVE: "INACTIVO",
  PASSWORD_CHANGE: "CAMBIO DE CONTRASEÑA",
};

function StatusBadge({ status }: { status: UserRow["status"] }) {
  if (status === "ACTIVE") return <Badge variant="success">ACTIVO</Badge>;
  if (status === "PASSWORD_CHANGE")
    return <Badge variant="default">CAMBIO DE CONTRASEÑA</Badge>;
  return <Badge variant="muted">INACTIVO</Badge>;
}

type Row = UserRow & { estadoLabel: string };

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

  const rows: Row[] = React.useMemo(
    () =>
      (selected ? users.filter((u) => u.roleId === selected) : users).map(
        (u) => ({ ...u, estadoLabel: STATUS_LABEL[u.status] })
      ),
    [users, selected]
  );

  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "cargoActual",
      header: "Cargo",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.cargoActual ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "roleName",
      header: "Perfil",
      cell: ({ row }) => row.original.roleName ?? "—",
    },
    {
      accessorKey: "estadoLabel",
      header: "Estado",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    ...(canEdit
      ? ([
          {
            id: "acciones",
            header: "",
            cell: ({ row }) => (
              <div className="flex items-center justify-end gap-1">
                <Link
                  href={`/configuracion/usuarios/${row.original.id}/editar`}
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                  aria-label="Editar usuario"
                >
                  <Pencil className="size-4" />
                </Link>
                {row.original.id === currentUserId ? (
                  <span className="text-xs text-muted-foreground">Tú</span>
                ) : (
                  <UserStatusToggle
                    userId={row.original.id}
                    status={row.original.status}
                  />
                )}
              </div>
            ),
          },
        ] as ColumnDef<Row>[])
      : []),
  ];

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

      {/* Tabla con búsqueda, ordenamiento y exportación (filtrada por rol). */}
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Buscar usuario…"
        exportName="usuarios"
      />
    </div>
  );
}
