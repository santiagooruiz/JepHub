"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PencilRuler } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requestDesign, requestFichaTecnica } from "./actions";

export function RequestDesignButton({
  quoteId,
  designRequestId,
}: {
  quoteId: string;
  designRequestId: string | null;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  if (designRequestId) {
    return (
      <Button asChild variant="outline" className="w-full">
        <Link href={`/backlog/${designRequestId}`}>
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
            const res = await requestDesign(quoteId);
            if (res.ok) router.push(`/backlog/${res.id}`);
            else setError(res.error);
          })
        }
      >
        <PencilRuler className="size-4" /> Solicitar planos/cambios
      </Button>
      {error && <p className="mt-1 text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </div>
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
            if (res.ok) router.push(`/backlog?producto=${res.id}`);
            else setError(res.error);
          })
        }
      >
        <PencilRuler className="size-4" /> Solicitar ficha técnica
      </Button>
      {error && <p className="mt-1 text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  );
}
