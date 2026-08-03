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
  .min(1, "Email is required")
  .max(EMAIL_MAX_LENGTH, `Email must be ${EMAIL_MAX_LENGTH} characters or fewer`)
  .email("Enter a valid email address");

export function nameField(label: string) {
  return z
    .string()
    .min(NAME_MIN_LENGTH, `${label} is required`)
    .max(NAME_MAX_LENGTH, `${label} must be ${NAME_MAX_LENGTH} characters or fewer`)
    .refine(isValidName, {
      message: `${label} can only contain letters, spaces, hyphens, and apostrophes`,
    });
}

export const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer`)
  .refine((value) => !containsEmoji(value), "Password can't contain emoji")
  .refine(
    isStrongPassword,
    "Password needs an uppercase letter, a lowercase letter, a digit, and a symbol",
  );

export const loginSchema = z.object({
  email,
  // Login intentionally does NOT re-check strength here — an existing
  // account's password was already validated at registration time, and
  // over-validating a login field just risks blocking a real password with
  // a client-side rule mismatch. Only presence/length matter.
  password: z
    .string()
    .min(1, "Password is required")
    .max(PASSWORD_MAX_LENGTH, `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer`),
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
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;
