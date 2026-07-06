"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "./actions";

export function DeleteButton({
  id,
  action,
  confirmLabel = "¿Eliminar este registro?",
  successMessage = "Registro eliminado",
}: {
  id: string;
  action: (id: string) => Promise<ActionResult>;
  confirmLabel?: string;
  successMessage?: string;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  function onClick() {
    if (!window.confirm(confirmLabel)) return;
    start(async () => {
      const res = await action(id);
      if (res.ok) {
        toast.success(successMessage);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Eliminar"
      disabled={pending}
      onClick={onClick}
      className="text-[hsl(var(--destructive))] hover:bg-destructive/10"
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
