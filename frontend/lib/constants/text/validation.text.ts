import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  TICKET_TITLE_MIN_LENGTH,
  TICKET_TITLE_MAX_LENGTH,
  TICKET_DESCRIPTION_MIN_LENGTH,
  TICKET_DESCRIPTION_MAX_LENGTH,
  TICKET_CLOSE_REASON_MIN_LENGTH,
  TICKET_CLOSE_REASON_MAX_LENGTH,
  TICKET_REOPEN_REASON_MIN_LENGTH,
  TICKET_REOPEN_REASON_MAX_LENGTH,
  TICKET_MESSAGE_CONTENT_MAX_LENGTH,
  AI_CHAT_MESSAGE_MAX_LENGTH,
} from "@helpdesk/shared";

/**
 * Centralized zod validation messages for lib/validation/*-schemas.ts.
 * These are frontend-only (the backend's class-validator decorators don't
 * carry custom messages — see backend DTOs), but the *bounds* they quote
 * still come from `@helpdesk/shared` so a length limit can't drift between
 * this copy and what the backend DTO actually enforces.
 */

export const AUTH_VALIDATION_TEXT = {
  EMAIL_REQUIRED: "Email is required",
  emailMaxLength: `Email must be ${EMAIL_MAX_LENGTH} characters or fewer`,
  EMAIL_INVALID: "Enter a valid email address",
  nameRequired: (label: string) => `${label} is required`,
  nameMaxLength: (label: string) =>
    `${label} must be ${NAME_MAX_LENGTH} characters or fewer`,
  nameInvalidChars: (label: string) =>
    `${label} can only contain letters, spaces, hyphens, and apostrophes`,
  passwordMinLength: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  passwordMaxLength: `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer`,
  PASSWORD_NO_EMOJI: "Password can't contain emoji",
  PASSWORD_NOT_STRONG:
    "Password needs an uppercase letter, a lowercase letter, a digit, and a symbol",
  LOGIN_PASSWORD_REQUIRED: "Password is required",
  CONFIRM_PASSWORD_REQUIRED: "Please confirm your password",
  PASSWORDS_DONT_MATCH: "Passwords don't match",
} as const;

export const ACCOUNT_VALIDATION_TEXT = {
  CURRENT_PASSWORD_REQUIRED: "Current password is required",
  CONFIRM_NEW_PASSWORD_REQUIRED: "Please confirm your new password",
  PASSWORDS_DONT_MATCH: "Passwords don't match",
  NEW_PASSWORD_SAME_AS_CURRENT:
    "New password must be different from your current password",
} as const;

export const TICKET_VALIDATION_TEXT = {
  titleMinLength: `Title must be at least ${TICKET_TITLE_MIN_LENGTH} characters`,
  titleMaxLength: `Title must be ${TICKET_TITLE_MAX_LENGTH} characters or fewer`,
  TITLE_NO_EMOJI: "Title can't contain emoji",
  descriptionMinLength: `Description must be at least ${TICKET_DESCRIPTION_MIN_LENGTH} characters`,
  descriptionMaxLength: `Description must be ${TICKET_DESCRIPTION_MAX_LENGTH} characters or fewer`,
  DESCRIPTION_NO_EMOJI: "Description can't contain emoji",
  closeReasonMinLength: `Reason must be at least ${TICKET_CLOSE_REASON_MIN_LENGTH} characters`,
  closeReasonMaxLength: `Reason must be ${TICKET_CLOSE_REASON_MAX_LENGTH} characters or fewer`,
  reopenReasonMinLength: `Reason must be at least ${TICKET_REOPEN_REASON_MIN_LENGTH} characters`,
  reopenReasonMaxLength: `Reason must be ${TICKET_REOPEN_REASON_MAX_LENGTH} characters or fewer`,
  REASON_NO_EMOJI: "Reason can't contain emoji",
  MESSAGE_EMPTY: "Message can't be empty",
  messageMaxLength: `Message must be ${TICKET_MESSAGE_CONTENT_MAX_LENGTH} characters or fewer`,
  MESSAGE_NO_EMOJI: "Message can't contain emoji",
} as const;

/** Backs AiChatComposer's single-message input -- mirrors
 * AiChatMessageDto's bounds (backend/src/ai/dto/ai-chat.dto.ts), the same
 * "quote the shared constant, don't duplicate the number" pattern as
 * TICKET_VALIDATION_TEXT above. */
export const AI_CHAT_VALIDATION_TEXT = {
  MESSAGE_EMPTY: "Message can't be empty",
  messageMaxLength: `Message must be ${AI_CHAT_MESSAGE_MAX_LENGTH} characters or fewer`,
  MESSAGE_NO_EMOJI: "Message can't contain emoji",
} as const;

/** components/ui/password-requirements' live checklist labels. */
export const PASSWORD_REQUIREMENTS_TEXT = {
  UPPERCASE: "One uppercase letter",
  LOWERCASE: "One lowercase letter",
  DIGIT: "One number",
  SPECIAL_CHAR: "One symbol",
  NO_EMOJI: "No emoji",
} as const;
