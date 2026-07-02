import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authenticate,
  createSessionToken,
  cookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  // Anti fuerza-bruta: 10 intentos por IP cada 5 minutos.
  const rl = rateLimit(`login:${clientIp(req)}`, 10, 5 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const userId = await authenticate(parsed.data.email, parsed.data.password);
  if (!userId) {
    return NextResponse.json(
      { error: "Credenciales incorrectas" },
      { status: 401 }
    );
  }

  await db.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });

  const token = await createSessionToken(userId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions);
  return res;
}
