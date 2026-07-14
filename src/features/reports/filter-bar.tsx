"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SearchableSelect } from "@/components/ui/searchable-select";
import { PERIODS } from "./filters";

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
        <SearchableSelect
          value={periodo}
          onChange={(v) => update("periodo", v)}
          options={PERIODS.map((p) => ({ value: p.id, label: p.label }))}
          clearable={false}
          className="w-44"
        />
      </label>
      <label className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">Asesor</span>
        <SearchableSelect
          value={asesor}
          onChange={(v) => update("asesor", v)}
          options={advisors.map((a) => ({ value: a.id, label: a.name }))}
          placeholder="Todos"
          className="w-52"
        />
      </label>
    </div>
  );
}
