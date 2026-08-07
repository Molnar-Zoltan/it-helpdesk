/**
 * Config for Cloudflare's Turnstile siteverify API, used by
 * TurnstileService to gate POST /auth/register against bots (Step 7).
 * See that service for the verification request and fail-closed behavior
 * on a Cloudflare outage.
 */

export const TURNSTILE_SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const TURNSTILE_REQUEST_TIMEOUT_MS = 3000;
