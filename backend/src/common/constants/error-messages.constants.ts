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
  DEMO_ACCOUNT_PROTECTED:
    'This is a shared demo account and cannot be modified or deleted',
  NEW_PASSWORD_SAME_AS_CURRENT:
    'New password must be different from your current password',
  EMAIL_SAME_AS_CURRENT:
    'New email must be different from your current email',
} as const;

export const TICKETS_ERRORS = {
  TICKET_NOT_FOUND: 'Ticket not found',
  TICKET_ALREADY_CLOSED: 'Ticket is already closed',
  TICKET_NOT_CLOSED: 'Ticket is not closed',
  TICKET_CLOSED_CANNOT_MESSAGE:
    'Cannot post a message on a closed ticket. Reopen it first.',
  TICKET_ALREADY_ASSIGNED:
    'Ticket is already assigned to an agent; only an admin can reassign it',
  CANNOT_ASSIGN_OTHER_AGENT:
    'Agents can only self-assign; ask an admin to assign to someone else',
  AGENT_NOT_FOUND: 'Assignee not found or is not an agent',
  INVALID_STATUS_TRANSITION:
    'Cannot move a ticket from its current status to the requested one',
  TICKET_NOT_ASSIGNED_TO_YOU:
    'Only the assigned agent or an admin can update this ticket status',
} as const;
