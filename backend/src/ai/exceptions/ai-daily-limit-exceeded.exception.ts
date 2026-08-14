import { API_ERROR_CODES } from '@helpdesk/shared';
import { RateLimitedException } from '../../common/exceptions/rate-limited.exception';
import { AI_DAILY_LIMIT } from '../../common/constants/ai.constants';

/**
 * Thrown when a user has already used AI_DAILY_LIMIT chat turns today.
 * `retryAfterSeconds` here reflects the Redis key's remaining TTL, which
 * is longer than the actual time until the calendar day rolls over (see
 * AI_DAILY_LIMIT_TTL_SECONDS's comment) -- close enough for a UI countdown,
 * not meant to be exact to the second the way the login guard's is.
 */
export class AiDailyLimitExceededException extends RateLimitedException {
  constructor(retryAfterSeconds: number) {
    super(
      API_ERROR_CODES.AI_DAILY_LIMIT_EXCEEDED,
      `You've reached today's limit of ${AI_DAILY_LIMIT} AI chat messages. Please try again tomorrow, or file a ticket manually.`,
      retryAfterSeconds,
    );
  }
}
