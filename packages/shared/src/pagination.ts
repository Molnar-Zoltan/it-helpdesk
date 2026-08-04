/**
 * Shared pagination/sorting defaults and result shape for GET /tickets
 * (and any future list endpoint that reuses TicketsService.paginateTickets).
 * Promoted from a backend-only constants file (mirrors why
 * ACCESS_TOKEN_TTL_MS lives here instead of staying backend-only) so the
 * frontend's query hook and the backend's DTO can't drift apart on
 * defaults, limits, or which fields are sortable.
 */

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const TICKET_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'priority',
  'status',
] as const;

export type TicketSortableField = (typeof TICKET_SORTABLE_FIELDS)[number];

export const DEFAULT_TICKET_SORT_BY: TicketSortableField = 'createdAt';

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const DEFAULT_SORT_ORDER: SortOrder = 'desc';

/** Generic paginated list response shape, e.g. GET /tickets. */
export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
