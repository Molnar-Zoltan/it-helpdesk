"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { TICKETS_QUERY_KEY } from "@/lib/queries/use-tickets";
import type { UpdateTicketStatusPayload, TicketResponse } from "@/lib/api/types";

/**
 * Agent-driven status transitions (Step 9.2's endpoint). Deliberately
 * separate from useCloseTicket/useReopenTicket even though a CLOSED
 * target hits the same closeReason/closedAt/closedBy columns server-side
 * -- this is the general status-update route those two were never meant
 * to be, and keeping the hooks apart mirrors the backend's own split.
 */
export function useUpdateTicketStatus(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateTicketStatusPayload) =>
      apiClient.patch<TicketResponse>(`/tickets/${ticketId}/status`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
    },
  });
}
