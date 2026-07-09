import Link from "next/link";
import { ChevronLeft, UserPlus } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { Button } from "@/components/ui/button";
import { UsersManager, type UserRow, type RoleCard } from "@/features/users/users-manager";

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
      include: { role: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const roleCards: RoleCard[] = roles
    .slice()
    .sort((a, b) => ROLE_ORDER.indexOf(a.name) - ROLE_ORDER.indexOf(b.name))
    .map((r) => ({ id: r.id, name: r.name, count: r._count.users }));

  const userRows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    cargoActual: u.cargoActual,
    roleId: u.roleId,
    roleName: u.role?.name ?? null,
    status: u.status,
  }));

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
              {users.length} usuarios · filtra por rol
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

      <UsersManager
        roles={roleCards}
        users={userRows}
        canEdit={canEdit}
        currentUserId={user.id}
      />
    </div>
  );
}
