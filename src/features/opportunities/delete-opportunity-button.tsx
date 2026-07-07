"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { deleteOpportunity } from "./actions";

export function DeleteOpportunityButton({
  id,
  numero,
}: {
  id: string;
  numero: number;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      className="text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))]"
      onClick={() =>
        confirmDialog(`¿Eliminar la oportunidad N° ${numero}?`, () =>
          start(async () => {
            const res = await deleteOpportunity(id);
            if (res.ok) {
              toast.success("Oportunidad eliminada");
              router.push("/oportunidades");
            } else {
              toast.error(res.error);
            }
          })
        )
      }
    >
      <Trash2 className="size-4" /> Eliminar
    </Button>
  );
}
