/**
 * Centralized HTTP exception messages, grouped by domain. Keeping these in
 * one place avoids the same string drifting into slightly different wording
 * across services (e.g. "User not found" vs "user not found") and makes it
 * easy to see every user-facing error message at a glance.
 */

export const AUTH_ERRORS = {
  EMAIL_ALREADY_IN_USE: 'Email already in use',
  INVALID_CREDENTIALS: 'Invalid credentials',
  INVALID_REFRESH_TOKEN: 'Invalid refresh token',
  REFRESH_TOKEN_EXPIRED_OR_REVOKED: 'Refresh token expired or revoked',
  INSUFFICIENT_ROLE: 'Insufficient role',
} as const;

export const USERS_ERRORS = {
  USER_NOT_FOUND: 'User not found',
  CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
  EMAIL_ALREADY_IN_USE: 'Email already in use',
} as const;

export const TICKETS_ERRORS = {
  TICKET_NOT_FOUND: 'Ticket not found',
} as const;
