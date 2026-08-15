import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RateLimitService } from '../../common/services/rate-limit.service';
import { AiDailyLimitExceededException } from '../exceptions/ai-daily-limit-exceeded.exception';
import {
  AI_DAILY_LIMIT,
  AI_DAILY_IP_LIMIT,
  AI_DAILY_LIMIT_TTL_SECONDS,
} from '../../common/constants/ai.constants';
import { buildAiUsageKey, buildAiIpUsageKey } from '../ai-usage-key.util';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';

/**
 * Dual cap on AI chat turns: per-user (AI_DAILY_LIMIT, Step 10.2) *and*
 * per-IP (AI_DAILY_IP_LIMIT) -- the per-user cap alone doesn't stop
 * someone from registering more accounts to get more free turns, so this
 * checks both and blocks on whichever is hit first, same email+IP-style
 * reasoning LoginRateLimitGuard already established for brute-force
 * protection. Both counters are Redis-backed like the ticket-creation/
 * message cooldowns, day-scoped keys (see ai-usage-key.util.ts) rather
 * than a rolling TTL window defining the reset boundary.
 *
 * Deliberately the same AiDailyLimitExceededException regardless of
 * which cap tripped -- see that exception's own comment for why telling
 * an abuser which one blocked them would just hand them a way to route
 * around it.
 *
 * Every chat turn counts against both limits regardless of outcome (a
 * clarifying question costs the same Gemini call as one that ends in
 * create_ticket), so this increments both counters unconditionally like
 * TicketCreateRateLimitGuard, not conditionally like LoginRateLimitGuard.
 */
@Injectable()
export class AiDailyRateLimitGuard implements CanActivate {
  constructor(private rateLimit: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userKey = buildAiUsageKey(request.user.userId);
    const ipKey = buildAiIpUsageKey(request.ip ?? 'unknown');

    const [userStatus, ipStatus] = await Promise.all([
      this.rateLimit.isLimited(userKey, AI_DAILY_LIMIT),
      this.rateLimit.isLimited(ipKey, AI_DAILY_IP_LIMIT),
    ]);

    if (userStatus.limited || ipStatus.limited) {
      // If both are somehow capped at once, the real retry time is
      // whichever key's TTL is *longer* -- the request still can't
      // succeed until neither counter is limited, not just one of them.
      const retryAfterSeconds = Math.max(
        userStatus.retryAfterSeconds,
        ipStatus.retryAfterSeconds,
      );
      throw new AiDailyLimitExceededException(retryAfterSeconds);
    }

    await Promise.all([
      this.rateLimit.increment(userKey, AI_DAILY_LIMIT_TTL_SECONDS),
      this.rateLimit.increment(ipKey, AI_DAILY_LIMIT_TTL_SECONDS),
    ]);
    return true;
  }
}
