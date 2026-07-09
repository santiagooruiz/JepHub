import Link from "next/link";
import { UserPlus } from "lucide-react";

import { requirePermission } from "@/lib/guard";
import { Button } from "@/components/ui/button";
import { ErpClientsTable } from "@/features/clients/erp-clients-table";
import {
  CLIENTS_PAGE_SIZE,
  getErpClients,
  getErpClientStats,
  type ErpClientTipoFiltro,
} from "@/server/ofimatica/clients";

export const dynamic = "force-dynamic";

const TIPOS: ErpClientTipoFiltro[] = ["empresas", "personas", "prospectos"];

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; tipo?: string }>;
}) {
  const user = await requirePermission("view", "clients");
  const canCreate = user.ability.can("create", "clients");

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const tipo = TIPOS.includes(sp.tipo as ErpClientTipoFiltro)
    ? (sp.tipo as ErpClientTipoFiltro)
    : undefined;

  // Alcance por rol: un Asesor solo ve los clientes cuyo VENDEDOR (MTPROCLI)
  // sea uno de sus codven; admin y demás roles ven todo.
  const codvens = user.roleName === "Asesor" ? user.codvens : undefined;

  // Las tarjetas muestran los conteos por categoría (sin el filtro tipo);
  // la tabla sí se filtra por la tarjeta seleccionada.
  const [{ rows, total }, stats] = await Promise.all([
    getErpClients({ q, page, pageSize: CLIENTS_PAGE_SIZE, codvens, tipo }),
    getErpClientStats(q, codvens),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">Datos en vivo desde el ERP</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/clientes/nuevo">
              <UserPlus className="size-4" /> Registrar Prospecto
            </Link>
          </Button>
        )}
      </div>

      <ErpClientsTable
        rows={rows}
        total={total}
        page={page}
        pageSize={CLIENTS_PAGE_SIZE}
        q={q}
        tipo={tipo ?? null}
        stats={stats}
      />
    </div>
  );
}
