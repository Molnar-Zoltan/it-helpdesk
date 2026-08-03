import type { Role } from "@helpdesk/shared";

/** GET /users/me response shape, per docs/api-endpoints.md. */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt: string;
}

/** POST /auth/register body. acknowledgeWeakPassword is only sent on a
 * resubmit after the user confirms past a WEAK_PASSWORD_WARNING (422). */
export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acknowledgeWeakPassword?: boolean;
}

/** POST /auth/login body. */
export interface LoginPayload {
  email: string;
  password: string;
}

/** PATCH /users/me body. Both fields optional per the backend DTO, but the
 * Name tab always sends both since it's one combined form. */
export interface UpdateNamePayload {
  firstName?: string;
  lastName?: string;
}

/** PATCH /users/me response. */
export interface UpdateNameResponse {
  id: string;
  firstName: string;
  lastName: string;
}

/** PATCH /users/me/password body. acknowledgeWeakPassword is only sent on a
 * resubmit after the user confirms past a WEAK_PASSWORD_WARNING (422),
 * mirroring RegisterPayload's same field. */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  acknowledgeWeakPassword?: boolean;
}

/** PATCH /users/me/password response. */
export interface ChangePasswordResponse {
  message: string;
}
