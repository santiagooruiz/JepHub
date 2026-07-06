"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { setRolePermission } from "./actions";

/** Celda de la matriz de roles: badge clicable ACTIVO/—. */
export function PermissionToggle({
  roleId,
  permissionId,
  active,
}: {
  roleId: string;
  permissionId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title={active ? "Clic para desactivar" : "Clic para activar"}
      onClick={() =>
        start(async () => {
          const res = await setRolePermission(roleId, permissionId, !active);
          if (res.ok) {
            toast.success(active ? "Permiso desactivado" : "Permiso activado");
            router.refresh();
          } else {
            toast.error(res.error);
          }
        })
      }
      className={cn(
        "inline-flex h-6 min-w-16 items-center justify-center rounded-full px-2.5 text-xs font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        pending && "opacity-50",
        active
          ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400"
          : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
      )}
    >
      {active ? "ACTIVO" : "—"}
    </button>
  );
}
