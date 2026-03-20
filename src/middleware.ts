import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Must match Auth.js cookie naming: `__Secure-authjs.session-token` only when cookies are `secure`.
 * `NODE_ENV === "production"` alone is wrong for `next start` on http://localhost — the browser gets
 * `authjs.session-token` (no prefix), while middleware was looking for the __Secure- name → stuck on login.
 */
function sessionCookieUsesSecureFlag(req: NextRequest): boolean {
  const override = process.env.AUTH_COOKIE_SECURE?.toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;

  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim().toLowerCase();
    return first === "https";
  }
  return req.nextUrl.protocol === "https:";
}

/**
 * Edge-safe route protection: JWT only (no Prisma).
 *
 * **API routes (`/api/*`) are not authenticated here** — each handler must call
 * `guardApiSessionUser`, `guardSessionActor`, or equivalent (see `src/lib/auth/api-route-guard.ts`
 * and `docs/SECURITY.md`). Exceptions: public routes like `/api/auth/*`, `/api/health`.
 *
 * Authorization rules live in `src/lib/auth/permissions.ts` + feature service invariants.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: sessionCookieUsesSecureFlag(req),
  });

  const loggedIn = !!token;
  const isLogin = pathname.startsWith("/login");

  if (isLogin) {
    if (loggedIn) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (!loggedIn) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all pathnames except Next internals, auth API, and common static assets.
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
