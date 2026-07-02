"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PERIODS } from "./queries";

const selectCls =
  "h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function BiFilterBar({
  advisors,
}: {
  advisors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = React.useTransition();

  const periodo = sp.get("periodo") ?? "year";
  const asesor = sp.get("asesor") ?? "";

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    start(() => router.push(`?${params.toString()}`, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2" data-pending={pending ? "" : undefined}>
      <label className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">Periodo</span>
        <select value={periodo} onChange={(e) => update("periodo", e.target.value)} className={selectCls}>
          {PERIODS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">Asesor</span>
        <select value={asesor} onChange={(e) => update("asesor", e.target.value)} className={selectCls}>
          <option value="">Todos</option>
          {advisors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
