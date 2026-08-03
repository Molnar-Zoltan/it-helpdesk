import { z } from "zod";
import { PASSWORD_MAX_LENGTH } from "@helpdesk/shared";
import { nameField, password } from "./auth-schemas";

export const updateNameSchema = z.object({
  firstName: nameField("First name"),
  lastName: nameField("Last name"),
});
export type UpdateNameFormValues = z.infer<typeof updateNameSchema>;

export const changePasswordSchema = z
  .object({
    // Presence/length only, same treatment as loginSchema's password field —
    // this is the *existing* password being re-verified, not one to
    // strength-check.
    currentPassword: z
      .string()
      .min(1, "Current password is required")
      .max(PASSWORD_MAX_LENGTH, `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer`),
    newPassword: password,
    // Client-only field — never sent to the backend, stripped before the
    // mutation is called.
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ["confirmNewPassword"],
  })
  // Only catches an exact string match (unlike the backend, this can't
  // bcrypt-compare against the stored hash) — a fast, honest-effort check
  // that saves a round trip in the common case; the backend's hash-based
  // check remains the authoritative one.
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
