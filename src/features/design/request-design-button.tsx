"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PencilRuler } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { requestDesign, requestDesignChange, requestFichaTecnica } from "./actions";
import { BACKLOG_ESTADO_FINAL } from "./types";
import { SolicitarPlanosDialog } from "./solicitar-planos-dialog";

export function RequestDesignButton({
  quoteId,
  designRequestId,
  designRequestEstado,
  designRequestVersion,
  canUpload,
}: {
  quoteId: string;
  designRequestId: string | null;
  designRequestEstado?: string | null;
  designRequestVersion?: number;
  /** false cuando el storage (MinIO) no está configurado: solo registro de URL. */
  canUpload: boolean;
}) {
  const router = useRouter();

  if (designRequestId) {
    const cerrada = designRequestEstado === BACKLOG_ESTADO_FINAL;
    return (
      <div className="space-y-2">
        <Button asChild variant="outline" className="w-full">
          <Link href={`/backlog/${designRequestId}`}>
            <PencilRuler className="size-4" /> Ver en backlog
          </Link>
        </Button>
        {cerrada && (
          <SolicitarPlanosDialog
            dialogTitle={`Solicitar cambio (versión ${(designRequestVersion ?? 1) + 1})`}
            canUpload={canUpload}
            onCreate={(descripcion) => requestDesignChange(designRequestId, descripcion)}
            onDone={(id) => router.push(`/backlog/${id}`)}
            trigger={
              <Button className="w-full">
                <PencilRuler className="size-4" /> Solicitar cambio (versión{" "}
                {(designRequestVersion ?? 1) + 1})
              </Button>
            }
          />
        )}
      </div>
    );
  }

  return (
    <SolicitarPlanosDialog
      dialogTitle="Solicitar planos/cambios"
      canUpload={canUpload}
      onCreate={(descripcion) => requestDesign(quoteId, descripcion)}
      onDone={(id) => router.push(`/backlog/${id}`)}
      trigger={
        <Button variant="outline" className="w-full">
          <PencilRuler className="size-4" /> Solicitar planos/cambios
        </Button>
      }
    />
  );
}

/** "Solicitar ficha técnica" desde un pedido → Backlog "PT Ficha Técnica". */
export function RequestFichaTecnicaButton({
  orderId,
  designRequestId,
}: {
  orderId: string;
  designRequestId: string | null;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  if (designRequestId) {
    return (
      <Button asChild variant="outline" className="w-full">
        <Link href={`/backlog?producto=${designRequestId}`}>
          <PencilRuler className="size-4" /> Ver en backlog
        </Link>
      </Button>
    );
  }

  return (
    <div>
      <Button
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await requestFichaTecnica(orderId);
            if (res.ok) {
              toast.success("Ficha técnica solicitada");
              router.push(`/backlog?producto=${res.id}`);
            } else {
              setError(res.error);
              toast.error(res.error);
            }
          })
        }
      >
        <PencilRuler className="size-4" /> Solicitar ficha técnica
      </Button>
      {error && <p className="mt-1 text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  );
}
