"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "./actions";

export function DeleteButton({
  id,
  action,
  confirmLabel = "¿Eliminar este registro?",
}: {
  id: string;
  action: (id: string) => Promise<ActionResult>;
  confirmLabel?: string;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  function onClick() {
    if (!window.confirm(confirmLabel)) return;
    start(async () => {
      await action(id);
      router.refresh();
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
