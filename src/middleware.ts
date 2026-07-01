import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me"
);
const COOKIE = "jep_session";

async function hasValidSession(token?: string): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = await hasValidSession(req.cookies.get(COOKIE)?.value);
  const isLogin = pathname === "/login";

  if (!authed && !isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (authed && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Excluye API (para poder llamar /api/auth/*), estáticos y favicon.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
