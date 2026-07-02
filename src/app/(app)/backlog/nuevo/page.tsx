import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requirePermission } from "@/lib/guard";
import { InternalDesignForm } from "@/features/design/internal-design-form";

export default async function NuevoProductoPage() {
  await requirePermission("create", "backlog_design");
  return (
    <div>
      <Link
        href="/backlog"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Backlog Diseño
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo producto</h1>
        <p className="text-sm text-muted-foreground">
          Planificación de diseño &amp; desarrollo (PR-DI-01)
        </p>
      </div>
      <InternalDesignForm />
    </div>
  );
}
