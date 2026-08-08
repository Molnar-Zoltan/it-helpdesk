import { RateLimitedException } from '../../common/exceptions/rate-limited.exception';

/**
 * Thrown when POST /tickets/:id/messages is called again within the
 * cooldown window, scoped per-ticket — a cooldown on one thread doesn't
 * block replying on another. Anti-spam, not brute-force protection (see
 * rate-limit.constants.ts).
 */
export class TicketMessageRateLimitedException extends RateLimitedException {
  constructor(retryAfterSeconds: number) {
    super(
      'TICKET_MESSAGE_RATE_LIMITED',
      'You are sending messages too quickly. Please wait a moment before sending another.',
      retryAfterSeconds,
    );
  }
}
