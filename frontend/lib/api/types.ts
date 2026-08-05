import type {
  PaginatedResult,
  Role,
  SortOrder,
  TicketPriority,
  TicketSortableField,
  TicketStatus,
} from "@helpdesk/shared";

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

/** PATCH /users/me/email body. */
export interface ChangeEmailPayload {
  currentPassword: string;
  newEmail: string;
}

/** PATCH /users/me/email response. */
export interface ChangeEmailResponse {
  message: string;
}

/** DELETE /users/me body. */
export interface DeleteAccountPayload {
  currentPassword: string;
}

/** DELETE /users/me response. */
export interface DeleteAccountResponse {
  message: string;
}

/** POST /tickets body. priority is always sent explicitly by the create
 * form (defaulted to MEDIUM there) even though CreateTicketDto treats it
 * as optional server-side. */
export interface CreateTicketPayload {
  title: string;
  description: string;
  priority: TicketPriority;
}

/** POST /tickets response — the created Ticket row, per
 * TicketsService.create() / schema.prisma's Ticket model. agentId/status
 * are always null/OPEN on creation (no assignment until Step 8), but
 * typed fully here since GET endpoints will return the same shape. */
export interface TicketResponse {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  customerId: string | null;
  agentId: string | null;
}

/** GET /tickets query params, per FindTicketsQueryDto. All optional —
 * the backend fills in DEFAULT_PAGE/DEFAULT_LIMIT/etc. when omitted, but
 * useTickets always sends explicit values so its query key stays a
 * faithful cache key for whatever's actually showing on screen. */
export interface TicketListQuery {
  page: number;
  limit: number;
  sortBy: TicketSortableField;
  sortOrder: SortOrder;
}

/** GET /tickets response. */
export type TicketListResponse = PaginatedResult<TicketResponse>;
