import { containsEmoji } from './no-emoji';

export const NAME_MIN_LENGTH = 1;
export const NAME_MAX_LENGTH = 50;

/**
 * Allows Unicode letters (any language/script, so "Zoltán", "Müller", "田中" all
 * pass) plus spaces, hyphens, and apostrophes (straight or curly) for names like
 * "O'Brien" or "Jean-Luc". Rejects digits, emoji, and other symbols/punctuation.
 */
const VALID_NAME_PATTERN = /^[\p{L}][\p{L}\s'\u2019-]*$/u;

const MAX_CONSECUTIVE_SEPARATORS = /[\s'\u2019-]{2,}/;

/**
 * Returns true if `value` is a plausible human name: non-empty, only letters,
 * spaces, hyphens, and apostrophes, no emoji, and no runs of repeated
 * separators (e.g. "--", "  ", "''"). Does not check length — pair with
 * NAME_MIN_LENGTH/NAME_MAX_LENGTH for that.
 */
export function isValidName(value: string): boolean {
  if (!value || containsEmoji(value)) return false;
  if (MAX_CONSECUTIVE_SEPARATORS.test(value)) return false;
  return VALID_NAME_PATTERN.test(value);
}
