import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RateLimitService } from '../../common/services/rate-limit.service';
import { TicketMessageRateLimitedException } from '../exceptions/ticket-message-rate-limited.exception';
import { TICKET_MESSAGE_RATE_LIMIT_WINDOW_SECONDS } from '../../common/constants/rate-limit.constants';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';

/**
 * Anti-spam cooldown on ticket messages, scoped per-user-per-ticket so a
 * cooldown on one thread doesn't block replying somewhere else. Same
 * "count every attempt" shape as TicketCreateRateLimitGuard, for the same
 * reason (see its class comment) — just a shorter window, since a support
 * thread is conversational and shouldn't feel throttled for a real user.
 *
 * Deliberately doesn't check ticket ownership/access here — that stays
 * TicketsService's job (assertCanAccessMessages), same 404-not-403
 * pattern as the rest of the module. This guard only cares about request
 * frequency, not authorization.
 */
@Injectable()
export class TicketMessageRateLimitGuard implements CanActivate {
  constructor(private rateLimit: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const ticketId = request.params.id;
    // Express types route params as string | string[] (repeated query-string
    // style params), but a path param like :id is always a single string in
    // practice — the array case would only arise from a malformed URL, and
    // TicketsService's own lookup will 404 on that anyway.
    const ticketIdStr = Array.isArray(ticketId) ? ticketId[0] : ticketId;
    const key = `ratelimit:ticket-message:${request.user.userId}:${ticketIdStr}`;

    const status = await this.rateLimit.isLimited(key, 1);
    if (status.limited) {
      throw new TicketMessageRateLimitedException(status.retryAfterSeconds);
    }

    await this.rateLimit.increment(
      key,
      TICKET_MESSAGE_RATE_LIMIT_WINDOW_SECONDS,
    );
    return true;
  }
}
