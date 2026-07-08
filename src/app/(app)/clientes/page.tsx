import Link from "next/link";
import { UserPlus } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { Button } from "@/components/ui/button";
import { ClientsTable } from "@/features/clients/clients-table";
import { clientDisplayName } from "@/features/clients/queries";
import type { ClientRow } from "@/features/clients/types";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const user = await requirePermission("view", "clients");
  const canCreate = user.ability.can("create", "clients");
  const canEdit = user.ability.can("edit", "clients");
  const canDelete = user.ability.can("delete", "clients");

  const clients = await db.client.findMany({
    where: { companyId: user.companyId, deletedAt: null },
    include: {
      advisor: { select: { name: true } },
      activities: {
        orderBy: { fechaHora: "desc" },
        take: 1,
        select: { accion: true },
      },
    },
    orderBy: { numero: "desc" },
  });

  const now = Date.now();
  const rows: ClientRow[] = clients.map((c) => {
    const dias = c.ultimaInteraccion
      ? Math.floor((now - c.ultimaInteraccion.getTime()) / 86_400_000)
      : null;
    return {
      id: c.id,
      numero: c.numero,
      nombre: clientDisplayName(c),
      documento: c.numeroDocumento ?? "—",
      tipo: c.personType === "NATURAL" ? "Persona" : "Empresa",
      email: c.email ?? "",
      telefono: c.telefono ?? "",
      asesor: c.advisor?.name ?? "",
      estado: c.estado,
      ultimaInteraccion: c.ultimaInteraccion
        ? c.ultimaInteraccion.toLocaleDateString("es-CO")
        : "",
      dias,
      accion: c.activities[0]?.accion ?? "",
      canal: c.canal ?? "",
      fechaRegistro: c.createdAt.toLocaleDateString("es-CO"),
    };
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        {canCreate && (
          <Button asChild>
            <Link href="/clientes/nuevo">
              <UserPlus className="size-4" /> Registrar Prospecto
            </Link>
          </Button>
        )}
      </div>

      <ClientsTable data={rows} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}
