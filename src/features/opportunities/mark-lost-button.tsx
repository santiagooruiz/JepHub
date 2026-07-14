"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ThumbsDown } from "lucide-react";
import { toast } from "sonner";

import { confirmDialog } from "@/components/ui/confirm-dialog";
import { updateOpportunityStage } from "./actions";

/** Marca la oportunidad como "Perdida" (ícono en la tabla de oportunidades). */
export function MarkLostButton({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title="Marcar como perdida"
      aria-label="Marcar como perdida"
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
      onClick={() =>
        confirmDialog(`¿Marcar la oportunidad ${nombre} como perdida?`, () =>
          start(async () => {
            const res = await updateOpportunityStage(id, "Perdida");
            if (res.ok) {
              toast.success("Oportunidad marcada como perdida");
              router.refresh();
            } else {
              toast.error(res.error);
            }
          })
        )
      }
    >
      <ThumbsDown className="size-4" />
    </button>
  );
}
