"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/** Escena flat de mobiliario (sillón, lámpara, planta) para el panel de marca. */
function FurnitureScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      role="img"
      aria-label="Ilustración de mobiliario"
    >
      {/* Fondo circular */}
      <circle cx="200" cy="140" r="112" fill="#12A2BC" opacity="0.1" />
      <circle
        cx="200"
        cy="140"
        r="112"
        fill="none"
        stroke="#12A2BC"
        strokeOpacity="0.25"
        strokeDasharray="3 7"
      />
      {/* Destellos */}
      <circle cx="96" cy="70" r="3" fill="#12A2BC" opacity="0.5" />
      <circle cx="318" cy="96" r="4" fill="#12A2BC" opacity="0.35" />
      <circle cx="292" cy="42" r="2.5" fill="currentColor" opacity="0.25" />
      <circle cx="70" cy="150" r="2.5" fill="currentColor" opacity="0.2" />

      {/* Cuadro en la pared */}
      <rect
        x="130"
        y="58"
        width="52"
        height="40"
        rx="4"
        fill="currentColor"
        opacity="0.12"
      />
      <rect x="140" y="68" width="18" height="20" rx="2" fill="#12A2BC" opacity="0.6" />
      <rect
        x="163"
        y="74"
        width="10"
        height="14"
        rx="2"
        fill="currentColor"
        opacity="0.3"
      />

      {/* Alfombra */}
      <ellipse cx="200" cy="252" rx="150" ry="12" fill="currentColor" opacity="0.1" />

      {/* Sillón */}
      <rect x="128" y="118" width="86" height="92" rx="16" fill="currentColor" opacity="0.22" />
      <rect x="120" y="168" width="102" height="36" rx="12" fill="#12A2BC" opacity="0.85" />
      <rect x="108" y="150" width="22" height="56" rx="10" fill="currentColor" opacity="0.3" />
      <rect x="212" y="150" width="22" height="56" rx="10" fill="currentColor" opacity="0.3" />
      <rect x="126" y="206" width="8" height="22" rx="3" fill="currentColor" opacity="0.35" />
      <rect x="208" y="206" width="8" height="22" rx="3" fill="currentColor" opacity="0.35" />
      {/* Cojín */}
      <rect x="150" y="142" width="42" height="30" rx="8" fill="currentColor" opacity="0.35" />

      {/* Lámpara de piso */}
      <polygon points="280,96 316,96 308,124 288,124" fill="#12A2BC" opacity="0.9" />
      <circle cx="298" cy="132" r="6" fill="#F4C84A" opacity="0.9" />
      <rect x="296" y="124" width="4" height="98" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="280" y="222" width="36" height="8" rx="4" fill="currentColor" opacity="0.35" />

      {/* Planta */}
      <ellipse cx="86" cy="196" rx="7" ry="18" fill="#12A2BC" opacity="0.55" transform="rotate(-18 86 196)" />
      <ellipse cx="102" cy="194" rx="7" ry="20" fill="#12A2BC" opacity="0.75" />
      <ellipse cx="117" cy="197" rx="7" ry="16" fill="#12A2BC" opacity="0.55" transform="rotate(16 117 197)" />
      <polygon points="88,214 116,214 111,244 93,244" fill="currentColor" opacity="0.3" />

      {/* Mesa auxiliar */}
      <rect x="248" y="180" width="58" height="7" rx="3.5" fill="currentColor" opacity="0.35" />
      <rect x="253" y="187" width="5" height="42" rx="2" fill="currentColor" opacity="0.28" />
      <rect x="296" y="187" width="5" height="42" rx="2" fill="currentColor" opacity="0.28" />
      <rect x="262" y="164" width="20" height="16" rx="3" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo iniciar sesión");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-xl md:grid-cols-2">
        {/* Panel de marca */}
        <div className="relative hidden flex-col bg-[hsl(var(--sidebar))] p-8 text-[hsl(var(--sidebar-foreground))] md:flex">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="font-bold">J</span>
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-white">JEP Hub</div>
              <div className="text-xs text-[hsl(var(--sidebar-muted))]">
                JEP Mobiliari
              </div>
            </div>
          </div>

          <FurnitureScene className="mx-auto my-6 w-full max-w-[320px] flex-1" />

          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-white">
              Toda la operación comercial en un solo lugar
            </p>
            <p className="text-xs text-[hsl(var(--sidebar-muted))]">
              Prospectos, cotizaciones, pedidos, diseño y producción.
            </p>
          </div>
        </div>

        {/* Panel de formulario */}
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <div className="mb-8 flex items-center gap-2.5 md:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="font-bold">J</span>
            </div>
            <span className="font-semibold">JEP Hub</span>
          </div>

          <h1 className="text-lg text-muted-foreground">¡Hola!</h1>
          <p className="mb-8 text-2xl font-bold tracking-tight text-primary">
            Bienvenido de nuevo
          </p>

          <p className="mb-5 text-sm">
            <span className="font-semibold text-primary">Ingresa</span>{" "}
            <span className="text-muted-foreground">a tu cuenta</span>
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@jepmobiliari.com"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {error && (
              <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>

          <p className="mt-6 text-xs text-muted-foreground">
            ¿Sin acceso u olvidaste tu contraseña? Contacta al administrador.
          </p>
        </div>
      </div>
    </div>
  );
}
