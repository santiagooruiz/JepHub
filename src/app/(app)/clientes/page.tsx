import Link from "next/link";
import { UserPlus } from "lucide-react";

import { requirePermission } from "@/lib/guard";
import { isAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ErpClientsTable } from "@/features/clients/erp-clients-table";
import {
  CLIENTS_PAGE_SIZE,
  ERP_CLIENT_SORT_KEYS,
  getErpAsesores,
  getErpClientCiudades,
  getErpClients,
  getErpClientStats,
  type ErpClientSortKey,
  type ErpClientTipoFiltro,
} from "@/server/ofimatica/clients";

export const dynamic = "force-dynamic";

const TIPOS: ErpClientTipoFiltro[] = ["empresas", "personas", "prospectos"];

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    tipo?: string;
    sort?: string;
    dir?: string;
    ciudad?: string;
    asesor?: string;
  }>;
}) {
  const user = await requirePermission("view", "clients");
  const canCreate = user.ability.can("create", "clients");
  const canEdit = user.ability.can("edit", "clients");
  const admin = isAdmin(user);

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const tipo = TIPOS.includes(sp.tipo as ErpClientTipoFiltro)
    ? (sp.tipo as ErpClientTipoFiltro)
    : undefined;
  const sort = ERP_CLIENT_SORT_KEYS.includes(sp.sort as ErpClientSortKey)
    ? (sp.sort as ErpClientSortKey)
    : undefined;
  const dir = sp.dir === "desc" ? "desc" : "asc";
  const ciudad = sp.ciudad?.trim() || undefined;
  // El filtro por asesor es exclusivo del administrador.
  const vendedor = admin ? sp.asesor?.trim() || undefined : undefined;

  // Alcance por rol: un Asesor solo ve los clientes cuyo VENDEDOR (MTPROCLI)
  // sea uno de sus codven; admin y demás roles ven todo.
  const codvens = user.roleName === "Asesor" ? user.codvens : undefined;

  // Las tarjetas muestran los conteos por categoría (sin el filtro tipo);
  // la tabla sí se filtra por la tarjeta seleccionada.
  const [{ rows, total }, stats, ciudades, asesores] = await Promise.all([
    getErpClients({
      q,
      page,
      pageSize: CLIENTS_PAGE_SIZE,
      codvens,
      tipo,
      ciudad,
      vendedor,
      sort,
      dir,
    }),
    getErpClientStats({ q, codvens, ciudad, vendedor }),
    getErpClientCiudades(codvens),
    admin ? getErpAsesores() : Promise.resolve([]),
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
        sort={sort ?? null}
        dir={dir}
        ciudad={ciudad ?? null}
        asesor={vendedor ?? null}
        ciudades={ciudades}
        asesores={asesores}
        stats={stats}
        canEdit={canEdit}
      />
    </div>
  );
}
