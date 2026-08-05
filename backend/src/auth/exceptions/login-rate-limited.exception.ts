import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when a login attempt is blocked by Step 6's Redis-backed rate
 * limit (5 attempts / 15 min, keyed on email+IP together — see
 * architecture.md#rate-limiting). `retryAfterSeconds` lets the frontend
 * show a real countdown instead of a generic "try again later."
 */
export class LoginRateLimitedException extends HttpException {
  constructor(retryAfterSeconds: number) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'LOGIN_RATE_LIMITED',
        message: 'Too many login attempts. Please try again later.',
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
