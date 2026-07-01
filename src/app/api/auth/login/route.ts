import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authenticate,
  createSessionToken,
  cookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
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
