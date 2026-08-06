import { RateLimitService } from '../common/services/rate-limit.service';

/**
 * Both LoginRateLimitGuard (pre-check) and AuthService (record/reset) need
 * to land on the identical Redis key for the same email+IP pair — pulled
 * out here so that's structurally guaranteed rather than two independently
 * maintained string templates.
 */
export function buildLoginRateLimitKey(email: string, ip: string): string {
  const emailHash = RateLimitService.hashIdentifier(email.toLowerCase());
  const ipHash = RateLimitService.hashIdentifier(ip);
  return `ratelimit:login:${emailHash}:${ipHash}`;
}
