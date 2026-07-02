import { requirePermission } from "@/lib/guard";
import { listSpecialDesigns } from "@/features/design/queries";
import { SpecialGrid } from "@/features/design/special-grid";

export const dynamic = "force-dynamic";

export default async function EspecialesPage() {
  const user = await requirePermission("view", "special_designs");
  const items = await listSpecialDesigns(user.companyId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Diseños especiales ({items.length})
        </h1>
        <p className="text-sm text-muted-foreground">
          Catálogo de piezas/productos a medida (CÓDIGO ESPECIAL)
        </p>
      </div>
      <SpecialGrid items={items} />
    </div>
  );
}
