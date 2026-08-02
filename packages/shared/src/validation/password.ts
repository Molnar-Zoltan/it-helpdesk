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
 * Granular checks, one per password-strength criterion. Exported alongside
 * isStrongPassword() (which composes all of them) so a live UI checklist —
 * e.g. the register form's password requirements list — can show which
 * specific criteria are met without re-implementing the patterns and
 * risking drift from what the backend actually enforces.
 */
export function hasMinLength(value: string): boolean {
  return typeof value === "string" && value.length >= MIN_LENGTH;
}

export function hasUppercase(value: string): boolean {
  return typeof value === "string" && UPPERCASE_PATTERN.test(value);
}

export function hasLowercase(value: string): boolean {
  return typeof value === "string" && LOWERCASE_PATTERN.test(value);
}

export function hasDigit(value: string): boolean {
  return typeof value === "string" && DIGIT_PATTERN.test(value);
}

export function hasSpecialChar(value: string): boolean {
  return typeof value === "string" && SPECIAL_CHAR_PATTERN.test(value);
}

/**
 * Returns true if `value` is 8-64 characters and includes at least one
 * uppercase letter, one lowercase letter, one digit, and one special
 * character. Does not check for emoji — pair with containsEmoji() for that.
 */
export function isStrongPassword(value: string): boolean {
  if (typeof value !== "string") return false;
  if (value.length < MIN_LENGTH || value.length > MAX_LENGTH) return false;
  if (!hasUppercase(value)) return false;
  if (!hasLowercase(value)) return false;
  if (!hasDigit(value)) return false;
  if (!hasSpecialChar(value)) return false;
  return true;
}
