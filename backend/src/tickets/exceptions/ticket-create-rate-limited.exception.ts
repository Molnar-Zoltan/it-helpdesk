import { API_ERROR_CODES } from '@helpdesk/shared';
import { RateLimitedException } from '../../common/exceptions/rate-limited.exception';

/**
 * Thrown when POST /tickets is called again within the cooldown window —
 * anti-spam, not brute-force protection (see rate-limit.constants.ts).
 */
export class TicketCreateRateLimitedException extends RateLimitedException {
  constructor(retryAfterSeconds: number) {
    super(
      API_ERROR_CODES.TICKET_CREATE_RATE_LIMITED,
      'You are creating tickets too quickly. Please wait before submitting another.',
      retryAfterSeconds,
    );
  }
}
