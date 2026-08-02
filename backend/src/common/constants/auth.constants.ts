import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from '@helpdesk/shared';

/**
 * Auth/token configuration. `ACCESS_TOKEN_TTL_MS` / `REFRESH_TOKEN_TTL_MS`
 * now live in `@helpdesk/shared` (not just here) since the frontend BFF
 * layer (Step 5.2) mirrors these as cookie `maxAge` and needs the same
 * numbers — a single source of truth avoids the kind of drift this project
 * already hit once when refresh-token lifetime was hardcoded in two places
 * ('7d' string vs a raw ms literal). `JWT_REFRESH_EXPIRY_SECONDS` and
 * `JWT_ACCESS_EXPIRY` are still derived here so the JWT's own expiry and the
 * `RefreshToken.expiresAt` row can never drift apart.
 */

// jsonwebtoken's `expiresIn` accepts a number of seconds directly.
export const JWT_ACCESS_EXPIRY = ACCESS_TOKEN_TTL_MS / 1000;

export { REFRESH_TOKEN_TTL_MS };
export const JWT_REFRESH_EXPIRY_SECONDS = REFRESH_TOKEN_TTL_MS / 1000;

/**
 * bcrypt cost factor. Standardized at 12 everywhere passwords are hashed —
 * previously register() used 12 while changePassword() used 10, an
 * unintentional inconsistency for the same secret type.
 */
export const BCRYPT_SALT_ROUNDS = 12;
