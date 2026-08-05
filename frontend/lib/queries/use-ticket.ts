"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { TICKETS_QUERY_KEY } from "@/lib/queries/use-tickets";
import type { TicketResponse } from "@/lib/api/types";

/**
 * Nested under TICKETS_QUERY_KEY ("tickets") rather than a sibling key --
 * useCreateTicket's existing `invalidateQueries({ queryKey: TICKETS_QUERY_KEY })`
 * already matches by prefix, so it (harmlessly) invalidates any mounted
 * detail queries too without that hook needing to know this one exists.
 */
export function ticketQueryKey(id: string) {
  return [...TICKETS_QUERY_KEY, "detail", id] as const;
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ticketQueryKey(id),
    queryFn: () => apiClient.get<TicketResponse>(`/tickets/${id}`),
  });
}
