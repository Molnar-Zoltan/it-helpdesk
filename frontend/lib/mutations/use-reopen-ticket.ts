"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { TICKETS_QUERY_KEY } from "@/lib/queries/use-tickets";
import type { ReopenTicketPayload, TicketResponse } from "@/lib/api/types";

export function useReopenTicket(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReopenTicketPayload) =>
      apiClient.patch<TicketResponse>(`/tickets/${ticketId}/reopen`, payload),
    // Same reasoning as useCloseTicket -- invalidate the whole "tickets"
    // prefix so both the detail view and any cached list pages pick up
    // the status change.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
    },
  });
}
