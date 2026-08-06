/**
 * Login rate limiting config (Step 6). Unlike JWT_SECRET/DATABASE_URL,
 * these have documented defaults (README's Environment variables table)
 * rather than being hard requirements — a missing env var shouldn't crash
 * boot, it should fall back to the documented default.
 */
export const LOGIN_RATE_LIMIT_ATTEMPTS = Number(
  process.env.LOGIN_RATE_LIMIT_ATTEMPTS ?? 5,
);

export const LOGIN_RATE_LIMIT_WINDOW_SECONDS =
  Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES ?? 15) * 60;
