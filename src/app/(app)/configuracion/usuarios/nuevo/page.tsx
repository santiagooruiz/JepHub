import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requirePermission } from "@/lib/guard";
import { getUserFormOptions } from "@/features/users/queries";
import { UserForm } from "@/features/users/user-form";

export const dynamic = "force-dynamic";

export default async function NuevoUsuarioPage() {
  const user = await requirePermission("create", "users");
  const options = await getUserFormOptions(user.companyId);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/configuracion/usuarios"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Usuarios
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Nuevo usuario</h1>
      <UserForm options={options} />
    </div>
  );
}
