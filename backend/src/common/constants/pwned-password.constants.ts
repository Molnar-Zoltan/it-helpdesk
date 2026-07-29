/**
 * Config for the Have I Been Pwned "Pwned Passwords" range API used by
 * PwnedPasswordService. See that service for the k-anonymity request
 * pattern and fail-open behavior.
 */

export const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';
export const HIBP_REQUEST_TIMEOUT_MS = 3000;
