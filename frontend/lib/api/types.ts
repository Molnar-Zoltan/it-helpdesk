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
 * typed fully here since GET endpoints will return the same shape.
 * close/reopen fields are always null on a freshly created ticket, but
 * populated once PATCH /tickets/:id/close or /reopen has run — the
 * detail page (Step 5.7) is the first consumer that needs to read them. */
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
  closeReason: string | null;
  closedAt: string | null;
  closedBy: string | null;
  reopenReason: string | null;
  reopenedAt: string | null;
  reopenedBy: string | null;
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

/** PATCH /tickets/:id/close body. */
export interface CloseTicketPayload {
  reason: string;
}

/** PATCH /tickets/:id/reopen body. */
export interface ReopenTicketPayload {
  reason: string;
}

/** POST /tickets/:id/messages body. */
export interface CreateMessagePayload {
  content: string;
}

/** Shape returned by both POST /tickets/:id/messages and
 * GET /tickets/:id/messages, per schema.prisma's Message model. senderId
 * is nullable (a deleted user's messages survive with senderId set to
 * null), so the UI can't assume every message has an identifiable sender. */
export interface MessageResponse {
  id: string;
  content: string;
  isAiGenerated: boolean;
  createdAt: string;
  ticketId: string;
  senderId: string | null;
}
