"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { TICKETS_QUERY_KEY } from "@/lib/queries/use-tickets";
import type { CreateTicketPayload, TicketResponse } from "@/lib/api/types";

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTicketPayload) =>
      apiClient.post<TicketResponse>("/tickets", payload),
    // Invalidates every cached page/sort variant of the tickets list (the
    // query key is ["tickets", { page, limit, sortBy, sortOrder }] — this
    // prefix match catches all of them) so a freshly created ticket shows
    // up next time the list is viewed, without a manual refetch.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
    },
  });
}
