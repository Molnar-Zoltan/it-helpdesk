import {
  TICKET_TITLE_MIN_LENGTH,
  TICKET_TITLE_MAX_LENGTH,
} from '@helpdesk/shared';
import {
  TICKET_DESCRIPTION_MIN_LENGTH,
  TICKET_DESCRIPTION_MAX_LENGTH,
} from '@helpdesk/shared';

/**
 * AI chat / Gemini configuration (Step 10). GEMINI_MODEL is a code
 * constant, not an env var -- unlike GEMINI_API_KEY (a secret) there's no
 * per-environment reason for local/staging/prod to run different models,
 * and pinning it in code makes a model upgrade a reviewable diff rather
 * than an env-var change that's easy to lose track of.
 */
export const GEMINI_MODEL = 'gemini-3.5-flash-lite';

export const GEMINI_REQUEST_TIMEOUT_MS = 15_000;

/**
 * AI_DAILY_LIMIT has a documented default (README's Environment variables
 * table), same reasoning as LOGIN_RATE_LIMIT_* in rate-limit.constants.ts
 * -- a missing env var shouldn't crash boot, it should fall back to the
 * documented default.
 */
export const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 25);

/**
 * Per-IP daily cap, in addition to (not instead of) AI_DAILY_LIMIT's
 * per-user cap -- without this, a per-account limit alone doesn't stop
 * someone from just registering more accounts to get more free AI turns,
 * the same gap LoginRateLimitGuard's email+IP keying already closes for
 * brute-force login attempts. Deliberately higher than AI_DAILY_LIMIT
 * (4x, by default) rather than equal to it: a shared IP (office wifi, a
 * household, a school) can have several genuine customers on it in one
 * day, and this shouldn't visibly kick in for them -- it only matters
 * once usage on one IP is high enough to look like multi-accounting
 * rather than ordinary shared-network traffic.
 */
export const AI_DAILY_IP_LIMIT = Number(process.env.AI_DAILY_IP_LIMIT ?? 100);

/**
 * TTL on the Redis daily-usage counter. Deliberately longer than 24h: the
 * key is already scoped to a specific UTC calendar date (see
 * ai-usage-key.util.ts), so a new key is used the moment the date rolls
 * over regardless of this TTL -- it exists only to eventually clean up a
 * day's key rather than to define the reset boundary itself. 26h gives a
 * comfortable margin past the UTC day boundary no matter what time of day
 * the first request of that date landed.
 */
export const AI_DAILY_LIMIT_TTL_SECONDS = 26 * 60 * 60;

export const CREATE_TICKET_TOOL_NAME = 'create_ticket';

/**
 * System prompt for the ticket-intake assistant. Embeds the same length
 * bounds CreateTicketDto enforces server-side, so the model is steered
 * toward producing arguments that will actually pass validation -- but
 * validation is still the real gate (see ai.service.ts): a model that
 * ignores this instruction gets its tool call rejected, not silently
 * waved through.
 */
export const AI_CHAT_SYSTEM_INSTRUCTION = `You are the IT Helpdesk intake assistant. Your job is to have a short, friendly conversation with a customer to gather enough detail to file a support ticket, then call the ${CREATE_TICKET_TOOL_NAME} tool.

Guidelines:
- Ask clarifying questions if the issue is vague -- what device or software is affected, when it started, any error messages, what they've already tried.
- Never invent details the customer hasn't told you.
- Only call ${CREATE_TICKET_TOOL_NAME} once you have a clear, specific title (${TICKET_TITLE_MIN_LENGTH}-${TICKET_TITLE_MAX_LENGTH} characters) and a detailed description (${TICKET_DESCRIPTION_MIN_LENGTH}-${TICKET_DESCRIPTION_MAX_LENGTH} characters) of the problem.
- Only set a priority if the customer's urgency is clear from what they've said; otherwise omit it and it will default to MEDIUM.
- Keep your responses short and conversational -- this is a chat, not a form.`;
