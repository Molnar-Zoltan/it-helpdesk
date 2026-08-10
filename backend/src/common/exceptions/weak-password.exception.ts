import { HttpException, HttpStatus } from '@nestjs/common';
import { API_ERROR_CODES } from '@helpdesk/shared';

/**
 * Thrown when a password passes all hard-block checks (length, complexity,
 * top-1000 common-password list) but HIBP reports it's appeared in a known
 * breach. Distinct from a normal validation error (400): this is a
 * confirmable warning, not a hard rejection. The client is expected to
 * surface it as a "this password was found in a data breach — continue
 * anyway?" prompt and, if the user confirms, resubmit the same request with
 * `acknowledgeWeakPassword: true`.
 */
export class WeakPasswordException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        error: API_ERROR_CODES.WEAK_PASSWORD_WARNING,
        message:
          'This password has appeared in a known data breach. You can continue anyway, or choose a different password.',
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
