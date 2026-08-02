import "server-only";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from "@helpdesk/shared";

/**
 * The two httpOnly cookies that hold the access/refresh token pair. Never
 * read or set outside route handlers — the browser never gets JS access to
 * either value, and the NestJS backend never reads cookies at all (it only
 * ever accepts a Bearer token), so these names only matter within this app.
 */
export const ACCESS_TOKEN_COOKIE = "hd_access_token";
export const REFRESH_TOKEN_COOKIE = "hd_refresh_token";

/**
 * `secure` is gated on NODE_ENV rather than always-on, so the cookie still
 * gets set over plain http://localhost in local dev — a `Secure` cookie is
 * silently dropped by the browser on a non-TLS origin.
 */
const isProduction = process.env.NODE_ENV === "production";

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
};

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Sets both auth cookies from a fresh token pair (as returned by the
 * backend's /auth/register, /auth/login, or /auth/refresh). `maxAge` mirrors
 * the real token lifetime from @helpdesk/shared so a cookie never
 * meaningfully outlives, or expires meaningfully before, the token it holds.
 */
export async function setAuthCookies({
  accessToken,
  refreshToken,
}: TokenPair): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseCookieOptions,
    maxAge: ACCESS_TOKEN_TTL_MS / 1000,
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseCookieOptions,
    maxAge: REFRESH_TOKEN_TTL_MS / 1000,
  });
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
}
