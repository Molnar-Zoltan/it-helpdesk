import { RateLimitedException } from '../../common/exceptions/rate-limited.exception';

/**
 * Thrown when a login attempt is blocked by Step 6's Redis-backed rate
 * limit (5 attempts / 15 min, keyed on email+IP together — see
 * architecture.md#rate-limiting).
 */
export class LoginRateLimitedException extends RateLimitedException {
  constructor(retryAfterSeconds: number) {
    super(
      'LOGIN_RATE_LIMITED',
      'Too many login attempts. Please try again later.',
      retryAfterSeconds,
    );
  }
}
