import { RateLimitService } from '../common/services/rate-limit.service';

/**
 * Builds the Redis key for a user's AI daily usage counter. Scoped by UTC
 * calendar date directly in the key (rather than a rolling window from
 * first use) so the limit genuinely resets at UTC midnight -- see
 * AI_DAILY_LIMIT_TTL_SECONDS's comment in ai.constants.ts for why the
 * key's TTL doesn't also need to line up exactly with that boundary.
 */
export function buildAiUsageKey(userId: string): string {
  const dateKey = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
  return `ratelimit:ai:${userId}:${dateKey}`;
}

/**
 * Same UTC-date-scoped design as buildAiUsageKey, but keyed on a hashed
 * client IP instead of userId -- the second half of
 * AiDailyRateLimitGuard's dual per-user/per-IP check (AI_DAILY_IP_LIMIT
 * in ai.constants.ts), same email+IP-style reasoning LoginRateLimitGuard
 * already established. Hashed via RateLimitService.hashIdentifier, same
 * as every other IP-derived Redis key in this codebase, so a raw IP
 * address never actually sits in Redis.
 */
export function buildAiIpUsageKey(ip: string): string {
  const ipHash = RateLimitService.hashIdentifier(ip);
  const dateKey = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
  return `ratelimit:ai-ip:${ipHash}:${dateKey}`;
}
