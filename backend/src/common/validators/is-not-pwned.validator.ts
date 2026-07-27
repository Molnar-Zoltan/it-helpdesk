import { createHash } from 'crypto';
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';
const REQUEST_TIMEOUT_MS = 3000;

/**
 * Checks a password against Have I Been Pwned's Pwned Passwords API using
 * k-anonymity: only the first 5 hex characters of the password's SHA-1 hash
 * are sent, so the API never sees the full hash or the password itself.
 *
 * Fails OPEN: if the API is slow, unreachable, or errors, this resolves to
 * `false` (not pwned) rather than blocking registration/password-change on a
 * third-party outage. The failure is swallowed silently here; wire up
 * proper logging/metrics on this path once observability exists.
 */
export async function isPwnedPassword(password: string): Promise<boolean> {
  const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      signal: controller.signal,
      headers: { 'Add-Padding': 'true' }, // mitigates response-size side channel
    });
    if (!res.ok) return false; // fail open on non-2xx

    const body = await res.text();
    return body
      .split('\n')
      .some((line) => line.split(':')[0].trim() === suffix);
  } catch {
    return false; // fail open on network error, timeout, or abort
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Async validator: rejects passwords found in the HIBP breach corpus.
 * Skips the network call entirely for inputs that are already invalid by
 * length, so a garbage submission doesn't cost an external API round trip.
 */
export function IsNotPwned(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotPwned',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        async validate(value: unknown) {
          if (typeof value !== 'string') return true;
          if (value.length < 8 || value.length > 64) return true; // other validators will flag this
          return !(await isPwnedPassword(value));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} has appeared in a known data breach — please choose a different password`;
        },
      },
    });
  };
}
