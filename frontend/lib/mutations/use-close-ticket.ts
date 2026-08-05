"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { TICKETS_QUERY_KEY } from "@/lib/queries/use-tickets";
import type { CloseTicketPayload, TicketResponse } from "@/lib/api/types";

export function useCloseTicket(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CloseTicketPayload) =>
      apiClient.patch<TicketResponse>(`/tickets/${ticketId}/close`, payload),
    // Same broad "tickets" prefix invalidation as useCreateTicket -- this
    // catches both the detail query (status/close fields changed) and
    // every cached list page (status is visible there too, and a sort by
    // status would reorder around it).
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
    },
  });
}
