import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";

import { db } from "./db";
import { defineAbilitiesFor, type AppAbility } from "./abilities";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me"
);

export const SESSION_COOKIE = "jep_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: MAX_AGE,
};

// ── Contraseñas ──
export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// ── Token de sesión (JWT) ──
export async function createSessionToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

// ── Autenticación por credenciales ──
export async function authenticate(
  email: string,
  password: string
): Promise<string | null> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || user.status === "INACTIVE") return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user.id : null;
}

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  companyId: string;
  roleName: string | null;
  codven: string | null;
  codvens: string[];
  status: string;
  grants: { key: string; restriction: string | null }[];
  ability: AppAbility;
};

/** true si el usuario tiene el rol Administrador. */
export function isAdmin(user: { roleName: string | null }): boolean {
  return user.roleName === "Administrador";
}

/** true si el usuario tiene el rol Asesor (alcance restringido a lo propio). */
export function isAsesor(user: { roleName: string | null }): boolean {
  return user.roleName === "Asesor";
}

/** Usuario autenticado (cacheado por request). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = await verifySessionToken(token);
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            where: { active: true },
            include: { permission: true },
          },
        },
      },
    },
  });
  if (!user || user.status === "INACTIVE") return null;

  const grants = (user.role?.permissions ?? []).map((rp) => ({
    key: rp.permission.key,
    restriction: rp.restriction,
  }));

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    companyId: user.companyId,
    roleName: user.role?.name ?? null,
    codven: user.codven ?? null,
    codvens: user.codvens?.length ? user.codvens : user.codven ? [user.codven] : [],
    status: user.status,
    grants,
    ability: defineAbilitiesFor(grants),
  };
});
