/**
 * Shared by AccountMutationRateLimitGuard (pre-check) and UsersService
 * (record/reset) so both land on the identical Redis key — same pattern as
 * auth/login-rate-limit.util.ts. Keyed on userId only: unlike login, these
 * routes are already authenticated (JwtAuthGuard runs first), so there's
 * no separate email/IP identity to hash — the userId itself isn't a raw
 * credential, so it doesn't need hashing before it sits in Redis.
 */
export function buildAccountMutationRateLimitKey(userId: string): string {
  return `ratelimit:account-mutation:${userId}`;
}
