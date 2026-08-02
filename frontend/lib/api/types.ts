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
