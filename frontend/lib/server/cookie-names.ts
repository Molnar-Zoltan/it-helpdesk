/**
 * Cookie name constants only — deliberately split out of auth-cookies.ts so
 * proxy.ts (which runs in the edge runtime, not a route handler) can import
 * just the names without pulling in next/headers or the server-only guard,
 * neither of which are usable/needed there.
 */
export const ACCESS_TOKEN_COOKIE = "hd_access_token";
export const REFRESH_TOKEN_COOKIE = "hd_refresh_token";
