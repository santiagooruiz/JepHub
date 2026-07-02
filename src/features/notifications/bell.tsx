"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead } from "./actions";
import type { NotificationItem } from "./queries";

export function NotificationBell({
  items,
  unread,
}: {
  items: NotificationItem[];
  unread: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function markAll() {
    start(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notificaciones"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[hsl(var(--destructive))] px-1 text-[10px] font-bold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">Notificaciones</span>
            {unread > 0 && (
              <button
                onClick={markAll}
                disabled={pending}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                Marcar leídas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length ? (
              items.map((n) => {
                const body = (
                  <div className="flex gap-2 px-3 py-2">
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        n.leida ? "bg-transparent" : "bg-primary"
                      )}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{n.titulo}</p>
                      {n.cuerpo && (
                        <p className="truncate text-xs text-muted-foreground">{n.cuerpo}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">{n.createdAt}</p>
                    </div>
                  </div>
                );
                return n.href ? (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="block border-b last:border-0 hover:bg-accent"
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={n.id} className="border-b last:border-0">
                    {body}
                  </div>
                );
              })
            ) : (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Sin notificaciones.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
