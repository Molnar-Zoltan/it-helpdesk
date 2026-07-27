const MIN_LENGTH = 8;
const MAX_LENGTH = 64;

const UPPERCASE_PATTERN = /[A-Z]/;
const LOWERCASE_PATTERN = /[a-z]/;
const DIGIT_PATTERN = /[0-9]/;

/**
 * Printable ASCII punctuation: everything that isn't a letter, digit, or
 * space. Matches OWASP's recommended "special character" set. ASCII-only so
 * it never overlaps with the emoji ranges blocked separately by no-emoji.ts.
 */
const SPECIAL_CHAR_PATTERN = /[!-/:-@[-`{-~]/;

export const PASSWORD_MIN_LENGTH = MIN_LENGTH;
export const PASSWORD_MAX_LENGTH = MAX_LENGTH;

/**
 * Returns true if `value` is 8-64 characters and includes at least one
 * uppercase letter, one lowercase letter, one digit, and one special
 * character. Does not check for emoji — pair with containsEmoji() for that.
 */
export function isStrongPassword(value: string): boolean {
  if (typeof value !== "string") return false;
  if (value.length < MIN_LENGTH || value.length > MAX_LENGTH) return false;
  if (!UPPERCASE_PATTERN.test(value)) return false;
  if (!LOWERCASE_PATTERN.test(value)) return false;
  if (!DIGIT_PATTERN.test(value)) return false;
  if (!SPECIAL_CHAR_PATTERN.test(value)) return false;
  return true;
}
