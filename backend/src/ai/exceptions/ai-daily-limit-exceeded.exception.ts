import { API_ERROR_CODES } from '@helpdesk/shared';
import { RateLimitedException } from '../../common/exceptions/rate-limited.exception';

/**
 * Thrown when either the per-user or the per-IP daily AI chat cap has
 * been reached (see AiDailyRateLimitGuard) -- deliberately the same
 * exception, same code, same message for both cases. Naming which one
 * tripped would hand an abuser a way to tell "create another account"
 * apart from "wait it out", so the message stays generic and doesn't
 * quote a specific number either (a fresh account blocked purely by the
 * IP cap could have 0 messages of its own sent today, so a message like
 * "you've reached the limit of 25" would be actively misleading in that
 * case). `retryAfterSeconds` here reflects the longer of the two Redis
 * keys' remaining TTLs, which is longer than the actual time until the
 * calendar day rolls over (see AI_DAILY_LIMIT_TTL_SECONDS's comment) --
 * close enough for a UI countdown, not meant to be exact to the second
 * the way the login guard's is.
 */
export class AiDailyLimitExceededException extends RateLimitedException {
  constructor(retryAfterSeconds: number) {
    super(
      API_ERROR_CODES.AI_DAILY_LIMIT_EXCEEDED,
      "You've reached today's AI chat limit. Please try again tomorrow, or file a ticket manually.",
      retryAfterSeconds,
    );
  }
}
