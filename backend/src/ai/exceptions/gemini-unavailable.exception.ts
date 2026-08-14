import { HttpException, HttpStatus } from '@nestjs/common';
import { API_ERROR_CODES } from '@helpdesk/shared';
import { AI_ERRORS } from '../../common/constants/error-messages.constants';

/**
 * Thrown when the Gemini API call itself fails (timeout, network error,
 * non-2xx response) or returns a response with neither text nor a
 * function call -- treated the same way, since either case leaves nothing
 * useful to show the user. Deliberately fails closed with a clear 503
 * rather than a generic 500: the frontend (Step 10.6.2) can show "AI
 * assistant unavailable, try the manual form instead" rather than a bare
 * error, and a 503 doesn't count against AI_DAILY_LIMIT-adjacent client
 * retry/backoff assumptions the way a 4xx would.
 *
 * Not a RateLimitedException -- this isn't a rate limit, so it carries no
 * retryAfterSeconds.
 */
export class GeminiUnavailableException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: API_ERROR_CODES.AI_UNAVAILABLE,
        message: AI_ERRORS.GEMINI_UNAVAILABLE,
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
