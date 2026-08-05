"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { ticketQueryKey } from "@/lib/queries/use-ticket";
import type { MessageResponse } from "@/lib/api/types";

/**
 * Nested one level further under the single ticket's own key (["tickets",
 * "detail", id, "messages"]) -- a new message doesn't change the Ticket
 * row itself, so useCreateMessage invalidates only this key, not the
 * whole ["tickets", "detail", id] prefix the ticket detail query lives at.
 */
export function ticketMessagesQueryKey(id: string) {
  return [...ticketQueryKey(id), "messages"] as const;
}

export function useTicketMessages(id: string) {
  return useQuery({
    queryKey: ticketMessagesQueryKey(id),
    queryFn: () => apiClient.get<MessageResponse[]>(`/tickets/${id}/messages`),
  });
}
