import Link from "next/link";
import { ChevronLeft, Pencil, UserPlus } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserStatusToggle } from "@/features/users/status-toggle";

export const dynamic = "force-dynamic";

const ROLE_ORDER = [
  "Administrador",
  "Asesor",
  "Diseñador",
  "Diseñador Comercial",
  "Analista de Cartera",
  "Analista de Pedido",
  "Jefe de compra",
  "Consultor",
];

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return <Badge variant="success">ACTIVO</Badge>;
  if (status === "PASSWORD_CHANGE")
    return <Badge variant="default">CAMBIO DE CONTRASEÑA</Badge>;
  return <Badge variant="muted">INACTIVO</Badge>;
}

export default async function UsuariosPage() {
  const user = await requirePermission("view", "users");
  const companyId = user.companyId;
  const canEdit = user.ability.can("edit", "users");
  const canCreate = user.ability.can("create", "users");

  const [roles, users] = await Promise.all([
    db.role.findMany({
      where: { companyId },
      include: { _count: { select: { users: true } } },
    }),
    db.user.findMany({
      where: { companyId },
      include: { role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  roles.sort(
    (a, b) => ROLE_ORDER.indexOf(a.name) - ROLE_ORDER.indexOf(b.name)
  );

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/configuracion"
          className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Configuración
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
            <p className="text-sm text-muted-foreground">
              {users.length} usuarios · cupos por rol
            </p>
          </div>
          {canCreate && (
            <Button asChild>
              <Link href="/configuracion/usuarios/nuevo">
                <UserPlus className="size-4" /> Agregar usuario
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Cupos por rol (usados / límite) */}
      <div
        className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        style={{ gap: "var(--card-gap)" }}
      >
        {roles.map((r) => (
          <Card key={r.id} className="p-3">
            <p className="truncate text-sm text-muted-foreground" title={r.name}>
              {r.name}
            </p>
            <p className="tabular mt-1 text-lg font-bold">
              {r._count.users}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {r.seatLimit ?? "∞"}
              </span>
            </p>
          </Card>
        ))}
      </div>

      {/* Tabla de usuarios */}
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
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{u.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {u.cargoActual ?? "—"}
                </td>
                <td className="px-3 py-2">{u.role?.name ?? "—"}</td>
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
                      {u.id === user.id ? (
                        <span className="text-xs text-muted-foreground">Tú</span>
                      ) : (
                        <UserStatusToggle userId={u.id} status={u.status} />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
