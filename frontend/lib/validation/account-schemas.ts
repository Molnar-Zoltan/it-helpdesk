import { z } from "zod";
import { PASSWORD_MAX_LENGTH } from "@helpdesk/shared";
import { nameField, password, email } from "./auth-schemas";
import { ACCOUNT_VALIDATION_TEXT, AUTH_VALIDATION_TEXT } from "@/lib/constants/text/validation.text";

export const updateNameSchema = z.object({
  firstName: nameField("First name"),
  lastName: nameField("Last name"),
});
export type UpdateNameFormValues = z.infer<typeof updateNameSchema>;

// Presence/length only, same treatment as loginSchema's password field —
// this is always an *existing* password being re-verified, not one to
// strength-check. Shared by change-password, change-email, and
// delete-account, since all three require currentPassword the same way.
const currentPasswordField = z
  .string()
  .min(1, ACCOUNT_VALIDATION_TEXT.CURRENT_PASSWORD_REQUIRED)
  .max(PASSWORD_MAX_LENGTH, AUTH_VALIDATION_TEXT.passwordMaxLength);

// Exported so password-tab.tsx can tell this specific error apart from
// the length/strength/emoji ones already represented in the checklist —
// unlike those, this rule has no checklist item, so it must stay visible.
export const NEW_PASSWORD_SAME_AS_CURRENT_MESSAGE =
  ACCOUNT_VALIDATION_TEXT.NEW_PASSWORD_SAME_AS_CURRENT;

export const changePasswordSchema = z
  .object({
    currentPassword: currentPasswordField,
    newPassword: password,
    // Client-only field — never sent to the backend, stripped before the
    // mutation is called.
    confirmNewPassword: z.string().min(1, ACCOUNT_VALIDATION_TEXT.CONFIRM_NEW_PASSWORD_REQUIRED),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: ACCOUNT_VALIDATION_TEXT.PASSWORDS_DONT_MATCH,
    path: ["confirmNewPassword"],
  })
  // Only catches an exact string match (unlike the backend, this can't
  // bcrypt-compare against the stored hash) — a fast, honest-effort check
  // that saves a round trip in the common case; the backend's hash-based
  // check remains the authoritative one.
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: NEW_PASSWORD_SAME_AS_CURRENT_MESSAGE,
    path: ["newPassword"],
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const changeEmailSchema = z.object({
  currentPassword: currentPasswordField,
  newEmail: email,
});
export type ChangeEmailFormValues = z.infer<typeof changeEmailSchema>;

export const deleteAccountSchema = z.object({
  currentPassword: currentPasswordField,
});
export type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>;
