"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setUserStatus } from "./actions";

export function UserStatusToggle({
  userId,
  status,
}: {
  userId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const activo = status === "ACTIVE";

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await setUserStatus(
              userId,
              activo ? "INACTIVE" : "ACTIVE"
            );
            if (res.ok) {
              toast.success(activo ? "Usuario desactivado" : "Usuario activado");
              router.refresh();
            } else {
              setError(res.error);
              toast.error(res.error);
            }
          });
        }}
      >
        {activo ? "Desactivar" : "Activar"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
