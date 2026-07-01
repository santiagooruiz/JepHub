"use client";

import { useRouter } from "next/navigation";
import { Search, Bell, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { DensityToggle } from "./density-toggle";
import { openCommandPalette } from "./command-palette";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function Topbar({
  userName,
  roleName,
}: {
  userName: string;
  roleName: string;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

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

        <div className="mx-2 hidden text-right leading-tight sm:block">
          <div className="text-sm font-medium">{userName}</div>
          {roleName && (
            <div className="text-xs text-muted-foreground">{roleName}</div>
          )}
        </div>
        <div
          className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          title={userName}
        >
          {initials(userName)}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          onClick={logout}
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
