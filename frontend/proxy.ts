import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/server/cookie-names";

/**
 * Route prefixes that require an authenticated session. This is a UX
 * redirect only, not the real authorization boundary — that's the NestJS
 * backend verifying the JWT on every request through /api/backend's proxy.
 * Empty for now: Step 5.3 has no protected pages yet. 5.4's account pages
 * will be the first entries (e.g. "/account").
 */
const PROTECTED_ROUTE_PREFIXES: string[] = [];

/** Routes only a logged-out visitor should see. */
const AUTH_ONLY_ROUTES = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Presence-only check — we don't verify the JWT here, just whether a
  // session cookie exists, since that's all a redirect decision needs.
  const hasSession = request.cookies.has(ACCESS_TOKEN_COOKIE);

  if (AUTH_ONLY_ROUTES.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    !hasSession &&
    PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Keep this in sync with AUTH_ONLY_ROUTES / PROTECTED_ROUTE_PREFIXES above —
// the proxy only runs for paths matched here. Add new protected route
// prefixes to both this matcher and PROTECTED_ROUTE_PREFIXES together.
export const config = {
  matcher: ["/login", "/register"],
};
