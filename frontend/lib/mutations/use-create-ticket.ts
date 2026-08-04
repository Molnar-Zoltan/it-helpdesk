"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { CreateTicketPayload, TicketResponse } from "@/lib/api/types";

/**
 * No query invalidation here — there's no tickets-list query to invalidate
 * yet (that lands in Step 5.6). Once it exists, its query key should be
 * invalidated onSuccess here so a freshly created ticket shows up without
 * a manual refetch.
 */
export function useCreateTicket() {
  return useMutation({
    mutationFn: (payload: CreateTicketPayload) =>
      apiClient.post<TicketResponse>("/tickets", payload),
  });
}
