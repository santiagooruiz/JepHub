"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { updateQuoteState } from "./actions";
import { QUOTE_ESTADOS } from "./types";

export function QuoteStateSelect({
  id,
  estado,
}: {
  id: string;
  estado: string;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <select
      value={estado}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value;
        start(async () => {
          await updateQuoteState(id, v);
          router.refresh();
        });
      }}
      className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {QUOTE_ESTADOS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
