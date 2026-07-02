import { NextResponse } from "next/server";

import { applyMilestone } from "@/server/ofimatica/milestones";
import { isHito } from "@/server/ofimatica/types";

// Recepción de hitos del ERP "ofimática" (tapicería/listo/despacho).
// Autenticado por secreto compartido en la cabecera x-ofimatica-secret.
export async function POST(req: Request) {
  const secret = process.env.OFIMATICA_WEBHOOK_SECRET || "";
  const provided = req.headers.get("x-ofimatica-secret") || "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { orderId, hito, fecha } = (body ?? {}) as {
    orderId?: unknown;
    hito?: unknown;
    fecha?: unknown;
  };
  if (typeof orderId !== "string" || !isHito(hito)) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const ok = await applyMilestone(orderId, hito, typeof fecha === "string" ? fecha : undefined);
  if (!ok) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
