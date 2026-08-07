import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RateLimitService } from '../../common/services/rate-limit.service';
import { TicketCreateRateLimitedException } from '../exceptions/ticket-create-rate-limited.exception';
import { TICKET_CREATE_RATE_LIMIT_WINDOW_SECONDS } from '../../common/constants/rate-limit.constants';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';

/**
 * Anti-spam cooldown on ticket creation — not a security-critical
 * brute-force guard like LoginRateLimitGuard. The threat here is DB-growth
 * abuse (particularly against the publicly-known demo accounts, or via
 * open registration with no CAPTCHA until Step 7), not credential
 * guessing, so every attempt counts against the cooldown regardless of
 * outcome. That makes this guard fully self-contained: unlike login, no
 * service-side success/failure bookkeeping is needed — it checks and
 * increments in the same pass. Runs after JwtAuthGuard (applied at the
 * controller level), so request.user is already populated.
 */
@Injectable()
export class TicketCreateRateLimitGuard implements CanActivate {
  constructor(private rateLimit: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const key = `ratelimit:ticket-create:${request.user.userId}`;

    const status = await this.rateLimit.isLimited(key, 1);
    if (status.limited) {
      throw new TicketCreateRateLimitedException(status.retryAfterSeconds);
    }

    await this.rateLimit.increment(
      key,
      TICKET_CREATE_RATE_LIMIT_WINDOW_SECONDS,
    );
    return true;
  }
}
