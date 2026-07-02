"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { postSpecialMessage } from "./actions";

export type MessageItem = {
  id: string;
  body: string;
  userName: string | null;
  createdAt: string;
};

const TA =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function MessagesPanel({
  specialDesignId,
  messages,
}: {
  specialDesignId: string;
  messages: MessageItem[];
}) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await postSpecialMessage({ specialDesignId, body });
      if (res.ok) {
        setBody("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="rounded-md border p-3 text-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-medium">{m.userName ?? "Sistema"}</span>
              <span className="text-xs text-muted-foreground">{m.createdAt}</span>
            </div>
            <p className="whitespace-pre-wrap text-muted-foreground">{m.body}</p>
          </div>
        ))}
        {!messages.length && (
          <p className="text-sm text-muted-foreground">Sin mensajes.</p>
        )}
      </div>

      <form onSubmit={submit} className="space-y-2">
        <textarea
          rows={2}
          className={TA}
          placeholder="Escribe un mensaje…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          <Send className="size-4" /> Enviar
        </Button>
      </form>
    </div>
  );
}
