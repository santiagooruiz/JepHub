import Link from "next/link";
import { UserPlus } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    include: { advisor: { select: { name: true } } },
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
    };
  });

  const count = (estado: string) =>
    clients.filter((c) => c.estado === estado).length;
  const kpis = [
    { label: "Prospectos", value: count("Prospecto") },
    { label: "Gestión Cotización", value: count("Gestión Cotización") },
    { label: "Clientes", value: count("Cliente") },
    { label: "Perdidas", value: count("Gestión Perdida") },
    { label: "Total", value: clients.length },
  ];

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

      <div
        className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        style={{ gap: "var(--card-gap)" }}
      >
        {kpis.map((k) => (
          <Card key={k.label} className="p-3">
            <p className="truncate text-sm text-muted-foreground">{k.label}</p>
            <p className="tabular mt-1 text-xl font-bold">{k.value}</p>
          </Card>
        ))}
      </div>

      <ClientsTable data={rows} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}
