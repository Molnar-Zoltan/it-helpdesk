"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { ticketMessagesQueryKey } from "@/lib/queries/use-ticket-messages";
import type { CreateMessagePayload, MessageResponse } from "@/lib/api/types";

export function useCreateMessage(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMessagePayload) =>
      apiClient.post<MessageResponse>(`/tickets/${ticketId}/messages`, payload),
    // Narrower than useCreateTicket/useCloseTicket/useReopenTicket --
    // posting a message doesn't change the Ticket row itself (no status,
    // no updatedAt bump per schema.prisma), so only this ticket's own
    // messages query needs to refetch, not the detail query or list.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketMessagesQueryKey(ticketId) });
    },
  });
}
