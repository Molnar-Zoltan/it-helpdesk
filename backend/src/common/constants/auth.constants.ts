/**
 * Auth/token configuration. `REFRESH_TOKEN_TTL_MS` is the single source of
 * truth for refresh token lifetime — `JWT_REFRESH_EXPIRY_SECONDS` is derived
 * from it so the JWT's own expiry and the `RefreshToken.expiresAt` row can
 * never drift apart, which they previously could since both were hardcoded
 * separately ('7d' string vs a raw ms literal).
 */

export const JWT_ACCESS_EXPIRY = '15m';

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const JWT_REFRESH_EXPIRY_SECONDS = REFRESH_TOKEN_TTL_MS / 1000;

/**
 * bcrypt cost factor. Standardized at 12 everywhere passwords are hashed —
 * previously register() used 12 while changePassword() used 10, an
 * unintentional inconsistency for the same secret type.
 */
export const BCRYPT_SALT_ROUNDS = 12;
