import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { getUserFormOptions } from "@/features/users/queries";
import { UserForm, type UserEditing } from "@/features/users/user-form";

export const dynamic = "force-dynamic";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("edit", "users");
  const { id } = await params;

  const u = await db.user.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!u) notFound();

  const options = await getUserFormOptions(user.companyId);
  const editing: UserEditing = {
    id: u.id,
    name: u.name,
    email: u.email,
    roleId: u.roleId,
    cargoActual: u.cargoActual,
    codven: u.codven,
    numeroTelefonico: u.numeroTelefonico,
    status: u.status,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/configuracion/usuarios"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Usuarios
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Editar usuario</h1>
      <UserForm options={options} editing={editing} />
    </div>
  );
}
