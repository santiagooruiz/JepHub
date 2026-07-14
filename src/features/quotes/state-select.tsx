"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { SearchableSelect } from "@/components/ui/searchable-select";
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
    <SearchableSelect
      value={estado}
      disabled={pending}
      onChange={(v) =>
        start(async () => {
          await updateQuoteState(id, v);
          router.refresh();
        })
      }
      options={[...QUOTE_ESTADOS]}
      clearable={false}
      className="h-8 w-auto min-w-40 px-2"
      aria-label="Estado de la cotización"
    />
  );
}
