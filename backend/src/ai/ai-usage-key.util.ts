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
