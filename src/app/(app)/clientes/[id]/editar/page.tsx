import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { getClientOptions } from "@/features/clients/queries";
import { ClientForm, type ClientEditing } from "@/features/clients/client-form";

export const dynamic = "force-dynamic";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("edit", "clients");
  const { id } = await params;

  const c = await db.client.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
  });
  if (!c) notFound();

  const options = await getClientOptions(user.companyId);
  const editing: ClientEditing = {
    id: c.id,
    personType: c.personType,
    estado: c.estado,
    nombres: c.nombres,
    apellidos: c.apellidos,
    nombreComercial: c.nombreComercial,
    razonSocial: c.razonSocial,
    email: c.email,
    telefono: c.telefono,
    tipoDocumento: c.tipoDocumento,
    numeroDocumento: c.numeroDocumento,
    direccion: c.direccion,
    complementoDireccion: c.complementoDireccion,
    pais: c.pais,
    ciudad: c.ciudad,
    observaciones: c.observaciones,
    priceListId: c.priceListId,
    sectorId: c.sectorId,
    subSectorId: c.subSectorId,
    canal: c.canal,
    advisorId: c.advisorId,
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/clientes"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Clientes
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Editar cliente
      </h1>
      <ClientForm options={options} editing={editing} />
    </div>
  );
}
