import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { isAdmin, isAsesor } from "@/lib/auth";
import { getErpClientByNit } from "@/server/ofimatica/clients";
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

  // Igual que la ficha: todo lo que NO sea un cuid de Prisma se trata como NIT
  // del ERP → mismo formulario, pero guardando en MTPROCLI + ancla local.
  if (!/^c[a-z0-9]{24}$/.test(id)) {
    const erp = await getErpClientByNit(id);
    if (!erp) notFound();
    // Rol Asesor: solo puede editar clientes de sus propios codven.
    if (isAsesor(user) && !user.codvens.includes(erp.codven)) notFound();

    // El ancla local (relación por NIT) aporta los conceptos propios de JEP-Hub
    // que el ERP no guarda (canal, sector/subsector, observaciones…).
    const [options, anchor] = await Promise.all([
      getClientOptions(user.companyId),
      db.client.findFirst({
        where: { companyId: user.companyId, numeroDocumento: erp.nit, deletedAt: null },
      }),
    ]);

    const esEmpresa = erp.tipo === "Empresa";
    const editing: ClientEditing = {
      id: anchor?.id ?? "",
      personType: esEmpresa ? "JURIDICA" : "NATURAL",
      nombres: esEmpresa ? anchor?.nombres ?? null : anchor?.nombres ?? erp.nombre,
      apellidos: anchor?.apellidos ?? null,
      nombreComercial: anchor?.nombreComercial ?? null,
      razonSocial: esEmpresa ? erp.nombre : anchor?.razonSocial ?? null,
      email: erp.email || null,
      telefono: erp.tel1 || null,
      tipoDocumento: anchor?.tipoDocumento ?? (esEmpresa ? "NIT" : "CC"),
      numeroDocumento: erp.nit,
      direccion: erp.direccion || null,
      complementoDireccion: anchor?.complementoDireccion ?? null,
      pais: anchor?.pais ?? "Colombia",
      ciudad: erp.ciudad || anchor?.ciudad || null,
      observaciones: anchor?.observaciones ?? null,
      codprecio: erp.codprecio || null,
      sectorId: anchor?.sectorId ?? null,
      subSectorId: anchor?.subSectorId ?? null,
      canal: anchor?.canal ?? null,
      codven: erp.codven || null,
    };

    return (
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/clientes/${encodeURIComponent(erp.nit)}`}
          className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> {erp.nombre}
        </Link>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          Editar cliente
        </h1>
        <ClientForm
          options={options}
          editing={editing}
          isAdmin={isAdmin(user)}
          erpNit={erp.nit}
        />
      </div>
    );
  }

  const c = await db.client.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
  });
  if (!c) notFound();

  const options = await getClientOptions(user.companyId);
  const editing: ClientEditing = {
    id: c.id,
    personType: c.personType,
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
    codprecio: c.codprecio,
    sectorId: c.sectorId,
    subSectorId: c.subSectorId,
    canal: c.canal,
    codven: c.codven,
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
      <ClientForm options={options} editing={editing} isAdmin={isAdmin(user)} />
    </div>
  );
}
