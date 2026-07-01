import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/guard";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clientDisplayName } from "@/features/clients/queries";
import { estadoVariant } from "@/features/clients/types";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

export default async function ClienteFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("view", "clients");
  const canEdit = user.ability.can("edit", "clients");
  const { id } = await params;

  const c = await db.client.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    include: {
      advisor: { select: { name: true } },
      priceList: true,
      sector: true,
      subSector: true,
    },
  });
  if (!c) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/clientes"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Clientes
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {clientDisplayName(c)}
          </h1>
          <Badge variant={estadoVariant(c.estado)}>{c.estado}</Badge>
        </div>
        {canEdit && (
          <Button asChild variant="outline">
            <Link href={`/clientes/${c.id}/editar`}>
              <Pencil className="size-4" /> Editar
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información básica</CardTitle>
          </CardHeader>
          <div className="px-4 pb-4">
            <Row label="Tipo" value={c.personType === "NATURAL" ? "Persona Natural" : "Persona Jurídica"} />
            <Row label="Documento" value={`${c.tipoDocumento ?? ""} ${c.numeroDocumento ?? ""}`.trim()} />
            <Row label="Email" value={c.email} />
            <Row label="Teléfono" value={c.telefono} />
            <Row label="Asesor" value={c.advisor?.name} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ubicación e info adicional</CardTitle>
          </CardHeader>
          <div className="px-4 pb-4">
            <Row label="Dirección" value={c.direccion} />
            <Row label="País / Ciudad" value={[c.pais, c.ciudad].filter(Boolean).join(" / ")} />
            <Row label="Canal" value={c.canal} />
            <Row label="Lista de precio" value={c.priceList?.name} />
            <Row label="Sector" value={c.sector?.name} />
            <Row label="SubSector" value={c.subSector?.name} />
          </div>
        </Card>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        La ficha 360° completa (oportunidades, cotizaciones, pedidos, contactos,
        actividad y adjuntos) llega en el Sprint 3B.
      </p>
    </div>
  );
}
