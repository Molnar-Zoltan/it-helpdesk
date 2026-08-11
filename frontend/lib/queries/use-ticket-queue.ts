"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { TICKETS_QUERY_KEY } from "@/lib/queries/use-tickets";
import type { TicketQueueQuery, TicketQueueResponse } from "@/lib/api/types";

/**
 * Nested under TICKETS_QUERY_KEY ("tickets"), same reasoning as
 * ticketQueryKey in use-ticket.ts: useAssignTicket/useUpdateTicketStatus
 * (Step 9.6.2) can invalidate the whole "tickets" prefix on success and
 * this cache gets swept up automatically, without those mutations needing
 * a second, queue-specific invalidateQueries call.
 */
export function ticketQueueQueryKey(query: TicketQueueQuery) {
  return [...TICKETS_QUERY_KEY, "queue", query] as const;
}

export function useTicketQueue(
  query: TicketQueueQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ticketQueueQueryKey(query),
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(query.page),
        limit: String(query.limit),
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });
      if (query.status) params.set("status", query.status);
      if (query.priority) params.set("priority", query.priority);
      if (query.assignedTo) params.set("assignedTo", query.assignedTo);

      return apiClient.get<TicketQueueResponse>(
        `/tickets/queue?${params.toString()}`,
      );
    },
    // Lets the queue page skip firing this query at all for a CUSTOMER
    // (see TicketQueueView's canViewQueue check) rather than firing it and
    // discarding a guaranteed 403.
    enabled: options?.enabled ?? true,
    // Same reasoning as useTickets: flipping a filter or page should feel
    // like adjusting a view, not a fresh loading state every time.
    placeholderData: keepPreviousData,
  });
}
