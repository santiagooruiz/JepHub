import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requirePermission } from "@/lib/guard";
import { isAdmin } from "@/lib/auth";
import { isErpDbConfigured } from "@/server/ofimatica/db";
import { getErpAsesoresByCodvens } from "@/server/ofimatica/clients";
import { getClientOptions } from "@/features/clients/queries";
import { ClientForm } from "@/features/clients/client-form";

export const dynamic = "force-dynamic";

export default async function NuevoClientePage() {
  const user = await requirePermission("create", "clients");
  const admin = isAdmin(user);
  const options = await getClientOptions(user.companyId);

  // Asesor con varias sedes (varios codven): podrá elegir cuál al registrar.
  const misCodvens =
    !admin && user.codvens.length > 1 && isErpDbConfigured()
      ? await getErpAsesoresByCodvens(user.codvens)
      : [];

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
      <ClientForm options={options} isAdmin={admin} misCodvens={misCodvens} />
    </div>
  );
}
