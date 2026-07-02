import { NextResponse } from "next/server";

import { db } from "@/lib/db";

// Health check para el reverse proxy / orquestador. Verifica la BD.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "up", time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "error", db: "down" }, { status: 503 });
  }
}
