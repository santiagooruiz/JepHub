"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSignatureLink } from "./signature-actions";

export function SignaturePanel({
  quoteId,
  estado,
}: {
  quoteId: string;
  estado: string | null;
}) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function generate() {
    setError(null);
    start(async () => {
      const res = await createSignatureLink(quoteId);
      if (res.ok) {
        setUrl(res.url);
        try {
          await navigator.clipboard.writeText(res.url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          /* ignore */
        }
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Para convertir esta cotización en pedido debe ser aprobada por el
        cliente.
      </p>
      {estado && (
        <Badge
          variant={
            estado === "firmada"
              ? "success"
              : estado === "rechazada"
                ? "destructive"
                : "muted"
          }
        >
          Firma: {estado}
        </Badge>
      )}
      <Button
        onClick={generate}
        disabled={pending}
        variant="outline"
        className="w-full"
      >
        {copied ? (
          <>
            <Check className="size-4" /> Link copiado
          </>
        ) : (
          <>
            <Copy className="size-4" /> Copiar link de firma
          </>
        )}
      </Button>
      {url && <p className="break-all text-xs text-muted-foreground">{url}</p>}
      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </div>
  );
}
