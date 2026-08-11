"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { TICKETS_QUERY_KEY } from "@/lib/queries/use-tickets";
import type { AssignTicketPayload, TicketResponse } from "@/lib/api/types";

/**
 * Backs both "claim this ticket" (self-assign, payload omitted/{}) and
 * admin-only reassignment — same endpoint either way, per
 * TicketsService.assignTicket. Same broad "tickets" prefix invalidation
 * as useCloseTicket/useReopenTicket: catches the detail query (agentId
 * changed) and any cached queue/list pages (assignment is visible there
 * too, via TicketRow's You/Unassigned/Assigned badge).
 */
export function useAssignTicket(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AssignTicketPayload = {}) =>
      apiClient.patch<TicketResponse>(`/tickets/${ticketId}/assign`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
    },
  });
}
