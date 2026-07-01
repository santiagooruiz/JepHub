"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signQuote, rejectQuote } from "./signature-actions";

export function FirmaForm({ token }: { token: string }) {
  const router = useRouter();
  const [nombre, setNombre] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function firmar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await signQuote(token, nombre, email);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }
  function rechazar() {
    if (!window.confirm("¿Rechazar la cotización?")) return;
    setError(null);
    start(async () => {
      const res = await rejectQuote(token);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <form onSubmit={firmar} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Ingresa tus datos para aprobar y firmar esta cotización.
      </p>
      <Input
        placeholder="Tu nombre *"
        required
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <Input
        type="email"
        placeholder="Tu email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          Aprobar y firmar
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={rechazar}
        >
          Rechazar
        </Button>
      </div>
    </form>
  );
}
