import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base for every rate-limit-triggered 429. `retryAfterSeconds` lets the
 * frontend show a real countdown instead of a generic "try again later" —
 * every consumer (LoginRateLimitedException, the ticket cooldowns) reads it
 * straight off the Redis key's TTL, so it's accurate to the second.
 */
export class RateLimitedException extends HttpException {
  constructor(code: string, message: string, retryAfterSeconds: number) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: code,
        message,
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
