import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';
const REQUEST_TIMEOUT_MS = 3000;

/**
 * Checks passwords against Have I Been Pwned's Pwned Passwords API using
 * k-anonymity: only the first 5 hex characters of the password's SHA-1 hash
 * are ever sent, so HIBP never sees the full hash or the password itself.
 *
 * This is a SOFT check, not a hard block — see AuthService.register() and
 * UsersService.changePassword() for how the result is used (warn, let the
 * user confirm they still want to proceed). It fails OPEN: if the API is
 * slow, unreachable, or errors, `check()` resolves to `false` (treated as
 * "not found in a breach") rather than blocking the request on a
 * third-party outage.
 */
@Injectable()
export class PwnedPasswordService {
  private readonly logger = new Logger(PwnedPasswordService.name);

  async check(password: string): Promise<boolean> {
    const sha1 = createHash('sha1')
      .update(password)
      .digest('hex')
      .toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
        signal: controller.signal,
        headers: { 'Add-Padding': 'true' }, // mitigates response-size side channel
      });
      if (!res.ok) {
        this.logger.warn(`HIBP API returned ${res.status}; failing open`);
        return false;
      }

      const body = await res.text();
      return body
        .split('\n')
        .some((line) => line.split(':')[0].trim() === suffix);
    } catch (err) {
      this.logger.warn(
        `HIBP API unreachable; failing open: ${(err as Error).message}`,
      );
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}
