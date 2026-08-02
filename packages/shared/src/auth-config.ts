/**
 * Token lifetimes shared between the NestJS backend (which signs JWTs and
 * persists `RefreshToken.expiresAt`) and the Next.js BFF layer (which
 * mirrors these as `httpOnly` cookie `maxAge`, so a cookie never
 * meaningfully outlives — or expires meaningfully before — the token it
 * carries).
 *
 * The backend remains authoritative for actual authorization: every request
 * is still verified against the JWT signature/exp server-side regardless of
 * what a cookie says. These values only gate cookie lifetime and UX
 * (e.g. "your session will expire soon"), never enforcement itself. They're
 * centralized here (rather than duplicated) purely to avoid the kind of
 * silent drift this project has already hit once with `REFRESH_TOKEN_TTL_MS`
 * (see backend/src/common/constants/auth.constants.ts history).
 */
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
