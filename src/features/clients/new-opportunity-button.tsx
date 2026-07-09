"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ensureClientAnchor } from "./actions";

/**
 * "Nueva oportunidad" para un cliente del ERP: asegura el ancla en PostgreSQL
 * (por NIT) y navega al formulario con el id del cliente ya resuelto.
 */
export function NewOpportunityButton({
  anchor,
}: {
  anchor: { nit: string; nombre: string; esEmpresa: boolean };
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  function onClick() {
    start(async () => {
      const a = await ensureClientAnchor({
        nit: anchor.nit,
        nombre: anchor.nombre,
        esEmpresa: anchor.esEmpresa,
      });
      if (!a.ok) {
        toast.error(a.error);
        return;
      }
      if (!a.clientId) {
        toast.error("No se pudo relacionar el cliente.");
        return;
      }
      router.push(`/oportunidades/nuevo?clienteId=${a.clientId}`);
    });
  }

  return (
    <Button onClick={onClick} disabled={pending}>
      <Plus className="size-4" /> Nueva oportunidad
    </Button>
  );
}
