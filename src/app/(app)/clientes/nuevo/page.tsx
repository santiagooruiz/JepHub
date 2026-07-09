import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requirePermission } from "@/lib/guard";
import { isAdmin } from "@/lib/auth";
import { getClientOptions } from "@/features/clients/queries";
import { ClientForm } from "@/features/clients/client-form";

export const dynamic = "force-dynamic";

export default async function NuevoClientePage() {
  const user = await requirePermission("create", "clients");
  const options = await getClientOptions(user.companyId);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/clientes"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Clientes
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Registrar prospecto
      </h1>
      <ClientForm options={options} isAdmin={isAdmin(user)} />
    </div>
  );
}
