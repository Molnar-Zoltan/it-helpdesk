import "server-only";
import { setAuthCookies, clearAuthCookies, type TokenPair } from "./auth-cookies";

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://localhost:3001";

/**
 * Nest's default (no global exception filter) error response shape.
 * `message` is a plain string for most errors but an array of strings for
 * class-validator failures (whitelist/transform pipeline).
 */
export interface BackendErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

/** Plain fetch to the backend. Never called from the browser — the backend
 * only exists inside the private network this app's server runs in (or, in
 * dev, on localhost); nothing here reads or forwards browser cookies. */
export function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BACKEND_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

/**
 * Calls the backend's rotate-on-use /auth/refresh with the given refresh
 * token. On success, writes the new pair to cookies and returns the new
 * access token (so a caller mid-request, e.g. the proxy handler, can retry
 * immediately without re-reading cookies). On failure, clears both cookies
 * — a failed refresh means the session is over, not just this one call.
 *
 * This is a plain function, not an HTTP call to /api/auth/refresh, so the
 * proxy handler's retry-on-401 path doesn't cost a self-fetch round trip.
 */
export async function refreshTokens(refreshToken: string): Promise<string | null> {
  const res = await backendFetch("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    await clearAuthCookies();
    return null;
  }

  const tokens = (await res.json()) as TokenPair;
  await setAuthCookies(tokens);
  return tokens.accessToken;
}
