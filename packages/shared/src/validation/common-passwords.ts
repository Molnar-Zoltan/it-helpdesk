import { COMMON_PASSWORDS_TOP_1000 } from './common-passwords-top1000';

const COMMON_PASSWORDS_SET = new Set(
  COMMON_PASSWORDS_TOP_1000.map((p) => p.toLowerCase()),
);

/**
 * Returns true if `value` (case-insensitively) matches one of the top 1000
 * most common leaked passwords. Synchronous and dependency-free — always
 * available, no network round trip. Intended as a cheap first-pass filter
 * ahead of a network-based breach check (e.g. HIBP).
 */
export function isCommonPassword(value: string): boolean {
  if (typeof value !== 'string') return false;
  return COMMON_PASSWORDS_SET.has(value.toLowerCase());
}
