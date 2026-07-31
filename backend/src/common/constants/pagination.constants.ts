/**
 * Shared pagination/sorting defaults. Centralized here (rather than
 * colocated in tickets/) since Step 7's agent queue is expected to reuse
 * the same query/sort/paginate logic against a differently-scoped `where`.
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
