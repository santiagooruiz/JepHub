"use client";

import { Search, Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { DensityToggle } from "./density-toggle";
import { openCommandPalette } from "./command-palette";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      {/* Buscador / command palette */}
      <button
        onClick={openCommandPalette}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span>Buscar…</span>
        <kbd className="ml-auto rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Notificaciones">
          <Bell className="size-4" />
        </Button>
        <DensityToggle />
        <ThemeToggle />
        <div
          className="ml-1 flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          title="Perfil"
        >
          MP
        </div>
      </div>
    </header>
  );
}
