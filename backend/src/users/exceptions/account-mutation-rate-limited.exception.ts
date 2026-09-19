import { API_ERROR_CODES } from '@helpdesk/shared';
import { RateLimitedException } from '../../common/exceptions/rate-limited.exception';

/**
 * Thrown when too many failed `currentPassword` attempts hit PATCH
 * /users/me/password, PATCH /users/me/email, or DELETE /users/me within
 * the window — brute-force protection for account-mutation endpoints,
 * mirroring LoginRateLimitedException.
 */
export class AccountMutationRateLimitedException extends RateLimitedException {
  constructor(retryAfterSeconds: number) {
    super(
      API_ERROR_CODES.ACCOUNT_MUTATION_RATE_LIMITED,
      'Too many attempts. Please try again later.',
      retryAfterSeconds,
    );
  }
}
