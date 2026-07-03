import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PermissionToggle } from "@/features/roles/permission-toggle";

export const dynamic = "force-dynamic";

// Orden preferido de roles (como en la spec)
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

const MODULE_LABELS: Record<string, string> = {
  clients: "Clientes",
  opportunities: "Oportunidades",
  quotes: "Cotizaciones",
  orders: "Pedidos",
  backlog_design: "Backlog Diseño",
  special_designs: "Biblioteca Especiales",
  reports: "Reportes",
  categories: "Categorías",
  tags: "Tags",
  users: "Usuarios",
  parameters: "Parámetros",
  roles: "Roles",
};

export default async function RolesPage() {
  const user = await requirePermission("view", "roles");
  const companyId = user.companyId;
  const canManage = user.ability.can("manage", "roles");

  const [roles, permissions, activeRps] = await Promise.all([
    db.role.findMany({ where: { companyId } }),
    db.permission.findMany({ orderBy: { key: "asc" } }),
    db.rolePermission.findMany({
      where: { active: true, role: { companyId } },
    }),
  ]);

  roles.sort(
    (a, b) => ROLE_ORDER.indexOf(a.name) - ROLE_ORDER.indexOf(b.name)
  );

  const active = new Set(
    activeRps.map((rp) => `${rp.roleId}:${rp.permissionId}`)
  );

  // Agrupar permisos por módulo
  const groups = new Map<string, typeof permissions>();
  for (const p of permissions) {
    const mod = p.key.split(".")[0];
    if (!groups.has(mod)) groups.set(mod, []);
    groups.get(mod)!.push(p);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/configuracion"
            className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Configuración
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Roles y permisos
          </h1>
          <p className="text-sm text-muted-foreground">
            {permissions.length} permisos · {roles.length} roles
            {canManage &&
              " · haz clic en una celda para activar/desactivar (Administrador siempre tiene todo)"}
          </p>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 font-medium">
                Permiso
              </th>
              {roles.map((r) => (
                <th
                  key={r.id}
                  className="whitespace-nowrap px-3 py-2 text-center font-medium"
                >
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...groups.entries()].map(([mod, perms]) => (
              <ModuleRows
                key={mod}
                label={MODULE_LABELS[mod] ?? mod}
                perms={perms}
                roles={roles}
                active={active}
                cols={roles.length + 1}
                canManage={canManage}
              />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ModuleRows({
  label,
  perms,
  roles,
  active,
  cols,
  canManage,
}: {
  label: string;
  perms: { id: string; key: string; name: string }[];
  roles: { id: string; name: string }[];
  active: Set<string>;
  cols: number;
  canManage: boolean;
}) {
  return (
    <>
      <tr className="border-b bg-muted/20">
        <td
          colSpan={cols}
          className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {label}
        </td>
      </tr>
      {perms.map((p) => (
        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
          <td className="sticky left-0 z-10 bg-card px-3 py-2">
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-muted-foreground">{p.key}</div>
          </td>
          {roles.map((r) => {
            const on = active.has(`${r.id}:${p.id}`);
            const editable = canManage && r.name !== "Administrador";
            return (
              <td key={r.id} className="px-3 py-2 text-center">
                {editable ? (
                  <PermissionToggle
                    roleId={r.id}
                    permissionId={p.id}
                    active={on}
                  />
                ) : on ? (
                  <Badge variant="success">ACTIVO</Badge>
                ) : (
                  <Badge variant="muted">—</Badge>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
