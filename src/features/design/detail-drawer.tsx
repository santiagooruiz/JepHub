"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Panel lateral (slide-over) sobre el listado, al estilo del 👁️ del CRM
 * original: el fondo queda visible y "Salir"/Escape/click afuera cierran.
 * El contenido llega renderizado desde el servidor.
 */
export function DetailDrawer({
  closeHref,
  children,
}: {
  closeHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") router.push(closeHref, { scroll: false });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeHref, router]);

  return (
    <div className="fixed inset-0 z-50">
      <Link
        href={closeHref}
        scroll={false}
        aria-label="Cerrar detalle"
        className="absolute inset-0 bg-black/40 animate-in fade-in-0"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto border-l bg-background shadow-xl animate-in slide-in-from-right duration-200"
      >
        {children}
      </aside>
    </div>
  );
}
