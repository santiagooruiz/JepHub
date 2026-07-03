"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function TabsLite({
  tabs,
  defaultId,
}: {
  tabs: { id: string; label: string; content: React.ReactNode }[];
  /** Tab inicial (cae al primero si no existe). Cambiarlo requiere `key`. */
  defaultId?: string;
}) {
  const [active, setActive] = React.useState(
    tabs.some((t) => t.id === defaultId) ? defaultId : tabs[0]?.id
  );
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}
