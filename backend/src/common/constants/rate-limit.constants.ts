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

/**
 * Anti-spam cooldowns on ticket creation and messages — not brute-force
 * protection like login's limit above, but protection against DB-growth
 * abuse. The three seeded demo accounts' credentials are published in the
 * README for the live demo, and registration is open with no CAPTCHA until
 * Step 7 lands, so either path is an easy way to flood the shared demo (or
 * any account) with junk data otherwise.
 *
 * Ticket creation gets a full minute: filing more than one new ticket
 * within 60s isn't something a real user does. Messages get a much
 * shorter 10s: a real support thread is conversational — a person can
 * legitimately send a quick follow-up within a minute — so the cooldown
 * only needs to be long enough to stop a script firing requests
 * back-to-back, not long enough to get in the way of typing.
 */
export const TICKET_CREATE_RATE_LIMIT_WINDOW_SECONDS = 60;
export const TICKET_MESSAGE_RATE_LIMIT_WINDOW_SECONDS = 10;
