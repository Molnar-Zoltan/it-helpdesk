"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { TICKETS_QUERY_KEY } from "@/lib/queries/use-tickets";
import { AI_USAGE_QUERY_KEY } from "@/lib/queries/use-ai-usage";
import type { AiChatPayload } from "@/lib/api/types";
import type { AiChatResponse } from "@helpdesk/shared";

/**
 * POST /ai/chat. Stateless per Step 10.4 -- AiChatPanel is responsible for
 * building the full transcript (including the message just typed) and
 * passing it as `messages` on every call; this hook does no transcript
 * bookkeeping, it's a thin wrapper around the request/response pair.
 */
export function useAiChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AiChatPayload) =>
      apiClient.post<AiChatResponse>("/ai/chat", payload),
    // AiDailyRateLimitGuard increments the counter unconditionally before
    // AiService even runs (see backend/src/ai/guards/ -- every turn costs
    // a slot regardless of outcome, same as ticket-creation's cooldown),
    // so the usage count needs refetching on a failed call too, not just
    // a successful one -- onSettled rather than onSuccess.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: AI_USAGE_QUERY_KEY });
    },
    // Only a ticket_created result actually changes the tickets list;
    // a plain clarifying-question turn doesn't touch TicketsService at
    // all, so it doesn't need the broader invalidation useCreateTicket
    // does unconditionally.
    onSuccess: (response) => {
      if (response.type === "ticket_created") {
        queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      }
    },
  });
}
