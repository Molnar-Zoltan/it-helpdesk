import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

/**
 * Gates POST /admin/demo-reset behind a shared secret, not a user session.
 * The only legitimate caller is the scheduled GitHub Actions workflow
 * (Step 8.5, .github/workflows/demo-reset.yml) — there's no login flow for
 * a cron job, so JwtAuthGuard/RolesGuard don't fit here. This deliberately
 * means even the demo ADMIN account's own access token grants no access:
 * role has no bearing on this endpoint, only possession of
 * ADMIN_RESET_SECRET does.
 */
@Injectable()
export class DemoResetGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-admin-reset-secret');
    const expected = process.env.ADMIN_RESET_SECRET;

    // Fail closed: an unset secret must never be read as "no secret
    // required" — same fail-fast principle as main.ts's FRONTEND_URL check,
    // applied here at request time since a missing env var can't stop this
    // particular route from being registered.
    if (!expected || !provided || !safeEqual(provided, expected)) {
      throw new UnauthorizedException();
    }

    return true;
  }
}

// Constant-time comparison so a mismatched secret can't be brute-forced by
// timing how quickly the comparison fails — same reasoning as the token
// hash comparisons elsewhere in auth/. Buffer.from on two different-length
// strings still needs a length check first: timingSafeEqual throws instead
// of returning false when its inputs aren't the same length.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
