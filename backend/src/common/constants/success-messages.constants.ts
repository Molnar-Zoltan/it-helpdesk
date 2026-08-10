/**
 * Centralized success-response messages for the `/users/me` self-service
 * endpoints.
 */

export const USERS_SUCCESS = {
  PASSWORD_UPDATED: 'Password updated',
  EMAIL_UPDATED: 'Email updated',
  ACCOUNT_DELETED: 'Account deleted',
} as const;

export const ADMIN_SUCCESS = {
  DEMO_DATA_RESET: 'Demo data reset',
} as const;
