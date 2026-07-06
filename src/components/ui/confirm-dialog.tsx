"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

type ConfirmOptions = {
  /** Texto del botón que ejecuta la acción (por defecto "Eliminar"). */
  actionLabel?: string;
  /** Pinta el botón de acción en rojo destructivo (por defecto true). */
  destructive?: boolean;
};

type ConfirmRequest = ConfirmOptions & {
  message: string;
  onConfirm: () => void;
};

let pushRequest: ((req: ConfirmRequest) => void) | null = null;

/**
 * Confirmación modal centrada (reemplazo de window.confirm): muestra el
 * mensaje en un diálogo con botones de acción y "Cancelar"; solo ejecuta
 * onConfirm si el usuario pulsa el botón de acción. Requiere que
 * <ConfirmDialogHost /> esté montado (ver components/providers.tsx).
 */
export function confirmDialog(
  message: string,
  onConfirm: () => void,
  options: ConfirmOptions = {}
) {
  pushRequest?.({ message, onConfirm, ...options });
}

export function ConfirmDialogHost() {
  const [req, setReq] = React.useState<ConfirmRequest | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    pushRequest = (r) => {
      setReq(r);
      setOpen(true);
    };
    return () => {
      pushRequest = null;
    };
  }, []);

  const destructive = req?.destructive ?? true;

  function confirmar() {
    setOpen(false);
    req?.onConfirm();
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div className="flex items-start gap-3">
            <span
              className={
                destructive
                  ? "mt-0.5 rounded-full bg-destructive/10 p-2 text-[hsl(var(--destructive))]"
                  : "mt-0.5 rounded-full bg-primary/10 p-2 text-primary"
              }
              aria-hidden
            >
              <TriangleAlert className="size-5" />
            </span>
            <Dialog.Title className="pt-2 text-sm font-medium leading-relaxed">
              {req?.message}
            </Dialog.Title>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={destructive ? "destructive" : "default"}
              size="sm"
              onClick={confirmar}
            >
              {req?.actionLabel ?? "Eliminar"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
