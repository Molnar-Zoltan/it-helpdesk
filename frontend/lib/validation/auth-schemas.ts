import { z } from "zod";
import {
  EMAIL_MAX_LENGTH,
  NAME_MIN_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  isValidName,
  isStrongPassword,
  containsEmoji,
} from "@helpdesk/shared";
import { AUTH_VALIDATION_TEXT } from "@/lib/constants/text/validation.text";

/**
 * Wraps @helpdesk/shared's validation constants/functions rather than
 * hand-rolling rules here, so the frontend can never drift from what the
 * backend DTOs (register.dto.ts, update-name.dto.ts, etc.) actually enforce.
 * Format validity for email is deliberately NOT duplicated here — see
 * packages/shared/src/validation/email.ts for why; we only apply the shared
 * length cap plus zod's own format check as a good-enough live hint, and
 * defer to the backend's 400 for the authoritative answer.
 */

export const email = z
  .string()
  .min(1, AUTH_VALIDATION_TEXT.EMAIL_REQUIRED)
  .max(EMAIL_MAX_LENGTH, AUTH_VALIDATION_TEXT.emailMaxLength)
  .email(AUTH_VALIDATION_TEXT.EMAIL_INVALID);

export function nameField(label: string) {
  return z
    .string()
    .min(NAME_MIN_LENGTH, AUTH_VALIDATION_TEXT.nameRequired(label))
    .max(NAME_MAX_LENGTH, AUTH_VALIDATION_TEXT.nameMaxLength(label))
    .refine(isValidName, {
      message: AUTH_VALIDATION_TEXT.nameInvalidChars(label),
    });
}

export const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, AUTH_VALIDATION_TEXT.passwordMinLength)
  .max(PASSWORD_MAX_LENGTH, AUTH_VALIDATION_TEXT.passwordMaxLength)
  .refine((value) => !containsEmoji(value), AUTH_VALIDATION_TEXT.PASSWORD_NO_EMOJI)
  .refine(isStrongPassword, AUTH_VALIDATION_TEXT.PASSWORD_NOT_STRONG);

export const loginSchema = z.object({
  email,
  // Login intentionally does NOT re-check strength here — an existing
  // account's password was already validated at registration time, and
  // over-validating a login field just risks blocking a real password with
  // a client-side rule mismatch. Only presence/length matter.
  password: z
    .string()
    .min(1, AUTH_VALIDATION_TEXT.LOGIN_PASSWORD_REQUIRED)
    .max(PASSWORD_MAX_LENGTH, AUTH_VALIDATION_TEXT.passwordMaxLength),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: nameField("First name"),
    lastName: nameField("Last name"),
    email,
    password,
    // Client-only field — never sent to the backend, stripped before the
    // register mutation is called.
    confirmPassword: z.string().min(1, AUTH_VALIDATION_TEXT.CONFIRM_PASSWORD_REQUIRED),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: AUTH_VALIDATION_TEXT.PASSWORDS_DONT_MATCH,
    path: ["confirmPassword"],
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;
