import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { advisorScope } from "@/lib/scope";
import { getOpportunityOptions } from "@/features/opportunities/queries";
import {
  OpportunityForm,
  type OpportunityEditing,
} from "@/features/opportunities/opportunity-form";

export const dynamic = "force-dynamic";

export default async function EditarOportunidadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("edit", "opportunities");
  const { id } = await params;

  // Alcance: un Asesor no puede editar oportunidades ajenas (404).
  const o = await db.opportunity.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null, ...advisorScope(user) },
  });
  if (!o) notFound();

  const options = await getOpportunityOptions(user.companyId);
  const editing: OpportunityEditing = {
    id: o.id,
    clientId: o.clientId,
    nombre: o.nombre,
    contacto: o.contacto,
    cantidadPuestos: o.cantidadPuestos,
    areaCubrir: o.areaCubrir === null ? null : Number(o.areaCubrir),
    observaciones: o.observaciones,
    fechaCierreProyectada: o.fechaCierreProyectada
      ? o.fechaCierreProyectada.toISOString().slice(0, 10)
      : null,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/oportunidades"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Oportunidades
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Editar oportunidad
      </h1>
      <OpportunityForm options={options} editing={editing} />
    </div>
  );
}
