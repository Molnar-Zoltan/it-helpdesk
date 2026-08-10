/**
 * Cloudflare Turnstile config for the register form (Step 7.2). The site
 * key is public by design (it's sent to the browser either way — Turnstile
 * itself is the security boundary, verified server-side by
 * TurnstileGuard against TURNSTILE_SECRET_KEY), so NEXT_PUBLIC_ is
 * correct here, unlike BACKEND_API_URL.
 */
export const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js";
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
