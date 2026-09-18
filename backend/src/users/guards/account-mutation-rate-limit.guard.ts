import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RateLimitService } from '../../common/services/rate-limit.service';
import { AccountMutationRateLimitedException } from '../exceptions/account-mutation-rate-limited.exception';
import { ACCOUNT_MUTATION_RATE_LIMIT_ATTEMPTS } from '../../common/constants/rate-limit.constants';
import { buildAccountMutationRateLimitKey } from '../account-mutation-rate-limit.util';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';

/**
 * Pre-checks (never increments) the account-mutation rate limit before the
 * request reaches UsersService — same split as LoginRateLimitGuard.
 * UsersService is what actually calls increment()/reset() once it knows
 * whether `currentPassword` was correct (see the class comment on
 * RateLimitService for why that split exists). Runs after JwtAuthGuard,
 * which is applied at the controller level, so request.user is already
 * populated by the time this guard runs.
 */
@Injectable()
export class AccountMutationRateLimitGuard implements CanActivate {
  constructor(private rateLimit: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const key = buildAccountMutationRateLimitKey(request.user.userId);

    const status = await this.rateLimit.isLimited(
      key,
      ACCOUNT_MUTATION_RATE_LIMIT_ATTEMPTS,
    );
    if (status.limited) {
      throw new AccountMutationRateLimitedException(status.retryAfterSeconds);
    }
    return true;
  }
}
