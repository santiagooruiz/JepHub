import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requirePermission } from "@/lib/guard";
import { getOpportunityOptions } from "@/features/opportunities/queries";
import { OpportunityForm } from "@/features/opportunities/opportunity-form";

export const dynamic = "force-dynamic";

export default async function NuevaOportunidadPage() {
  const user = await requirePermission("create", "opportunities");
  const options = await getOpportunityOptions(user.companyId);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/oportunidades"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Oportunidades
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Nueva oportunidad
      </h1>
      <OpportunityForm options={options} />
    </div>
  );
}
