import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RateLimitService } from '../../common/services/rate-limit.service';
import { AiDailyLimitExceededException } from '../exceptions/ai-daily-limit-exceeded.exception';
import {
  AI_DAILY_LIMIT,
  AI_DAILY_LIMIT_TTL_SECONDS,
} from '../../common/constants/ai.constants';
import { buildAiUsageKey } from '../ai-usage-key.util';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';

/**
 * Per-user daily cap on AI chat turns (Step 10.2), Redis-backed like the
 * ticket-creation/message cooldowns -- but a counter with a real max
 * (AI_DAILY_LIMIT) and a day-scoped key, not a 1-request cooldown. See
 * ai-usage-key.util.ts for why the key itself carries the UTC date rather
 * than relying on a rolling TTL window to define the reset boundary.
 *
 * Deliberately no dedicated AiUsage table (see schema.md) -- Cloud Run's
 * scale-to-zero doesn't suit a relational per-user-per-day counter any
 * better here than it did for the login/IP rate limiting Step 6 already
 * moved off Postgres, and Redis INCR+EXPIRE avoids the [userId,date]
 * unique-constraint race a table would need to guard against.
 *
 * Every chat turn counts against the limit regardless of outcome (a
 * clarifying question costs the same Gemini call as one that ends in
 * create_ticket), so this increments unconditionally like
 * TicketCreateRateLimitGuard, not conditionally like LoginRateLimitGuard.
 */
@Injectable()
export class AiDailyRateLimitGuard implements CanActivate {
  constructor(private rateLimit: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const key = buildAiUsageKey(request.user.userId);

    const status = await this.rateLimit.isLimited(key, AI_DAILY_LIMIT);
    if (status.limited) {
      throw new AiDailyLimitExceededException(status.retryAfterSeconds);
    }

    await this.rateLimit.increment(key, AI_DAILY_LIMIT_TTL_SECONDS);
    return true;
  }
}
