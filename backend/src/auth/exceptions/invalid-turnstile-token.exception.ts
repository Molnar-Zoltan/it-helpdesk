import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when Step 7's Cloudflare Turnstile check on POST /auth/register
 * fails — the token was missing, invalid, expired, already-consumed, or
 * TurnstileService failed closed on a Cloudflare outage (see that service
 * for why). A 400, not a 429/403: this isn't a rate limit or an
 * authorization failure, it's a malformed/rejected request, same class of
 * problem as any other failed request-level validation.
 */
export class InvalidTurnstileTokenException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'TURNSTILE_VERIFICATION_FAILED',
        message: 'Captcha verification failed. Please try again.',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
