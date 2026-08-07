import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { RateLimitService } from '../../common/services/rate-limit.service';
import { LoginRateLimitedException } from '../exceptions/login-rate-limited.exception';
import { LOGIN_RATE_LIMIT_ATTEMPTS } from '../../common/constants/rate-limit.constants';
import { buildLoginRateLimitKey } from '../login-rate-limit.util';

/**
 * Pre-checks (never increments) the login rate limit before the request
 * reaches AuthService. Keyed on email+IP together, not either alone —
 * IP-only would let one bad actor lock out everyone behind the same NAT,
 * email-only would let someone hammer a single account from many IPs
 * without ever tripping a per-IP limit (see architecture.md#rate-limiting).
 *
 * Only checks here; AuthService.login is what actually calls
 * increment()/reset() once it knows whether the attempt succeeded —
 * see the class comment on RateLimitService for why that split exists.
 */
@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  constructor(private rateLimit: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const body = request.body as unknown;
    const email =
      body && typeof body === 'object' && 'email' in body
        ? (body as Record<string, unknown>).email
        : undefined;

    // Malformed bodies (missing/non-string email) aren't this guard's job
    // to reject — let the DTO's ValidationPipe produce the real 400 for it.
    if (typeof email !== 'string' || !email) {
      return true;
    }

    const key = buildLoginRateLimitKey(email, request.ip ?? 'unknown');
    const status = await this.rateLimit.isLimited(
      key,
      LOGIN_RATE_LIMIT_ATTEMPTS,
    );
    if (status.limited) {
      throw new LoginRateLimitedException(status.retryAfterSeconds);
    }
    return true;
  }
}
