"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  /** Texto del trigger cuando la opción está elegida (por defecto, `label`). */
  selectedLabel?: string;
};

/** Normaliza para buscar sin distinguir mayúsculas ni tildes. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Select con buscador (estilo select2): trigger con la misma apariencia de los
 * selects nativos del app y un popover con filtro de texto (cmdk). El valor ""
 * representa "sin selección" y se muestra con `placeholder`; si `clearable`,
 * aparece como primera opción para poder limpiar.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccione",
  searchPlaceholder = "Buscar…",
  clearable = true,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Strings simples o pares value/label. */
  options: (string | SelectOption)[];
  /** Etiqueta del valor vacío ("Seleccione", "Todos los asesores", …). */
  placeholder?: string;
  searchPlaceholder?: string;
  /** Ofrece el placeholder como opción para volver al valor vacío. */
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const opts: SelectOption[] = React.useMemo(
    () =>
      options.map((o) =>
        typeof o === "string" ? { value: o, label: o } : o
      ),
    [options]
  );
  const selected = opts.find((o) => o.value === value);

  // Valor actual fuera del catálogo (texto libre heredado): no perderlo.
  const extra: SelectOption[] =
    value && !selected ? [{ value, label: value }] : [];
  const all = [...extra, ...opts];
  const filtered = query
    ? all.filter((o) =>
        normalize(`${o.label} ${o.selectedLabel ?? ""}`).includes(
          normalize(query)
        )
      )
    : all;

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className={cn("truncate", !selected && !value && "text-muted-foreground")}>
            {selected ? (selected.selectedLabel ?? selected.label) : value || placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          // Igual de ancho que el trigger; la lista interna scrollea.
          style={{ width: "var(--radix-popover-trigger-width)" }}
          className="z-50 min-w-40 rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <Command shouldFilter={false} loop>
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder={searchPlaceholder}
                className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Command.List className="max-h-60 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-4 text-center text-sm text-muted-foreground">
                Sin resultados.
              </Command.Empty>
              {clearable && !query && (
                <Command.Item
                  value="__empty__"
                  onSelect={() => pick("")}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                >
                  <span className="size-4 shrink-0" />
                  {placeholder}
                </Command.Item>
              )}
              {filtered.map((o) => (
                <Command.Item
                  // cmdk exige values únicos; el label puede repetirse.
                  key={o.value || "__blank__"}
                  value={o.value || "__blank__"}
                  onSelect={() => pick(o.value)}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      o.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{o.label}</span>
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
