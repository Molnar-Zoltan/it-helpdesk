"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AiUsageResponse } from "@helpdesk/shared";

export const AI_USAGE_QUERY_KEY = ["ai", "usage"] as const;

/**
 * GET /ai/usage -- read-only, doesn't itself consume the daily limit (no
 * AiDailyRateLimitGuard on that route server-side), so AiUsageIndicator
 * can show "X of Y used today" before the user has sent a single chat
 * message. `enabled` mirrors useTickets/useTicketQueue's own pattern --
 * AiChatView only fires this once it knows the viewer is a CUSTOMER
 * (POST /ai/chat and this route are both @Roles(CUSTOMER)-gated), rather
 * than firing it and discarding a guaranteed 403 for an AGENT/ADMIN.
 */
export function useAiUsage(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: AI_USAGE_QUERY_KEY,
    queryFn: () => apiClient.get<AiUsageResponse>("/ai/usage"),
    enabled: options?.enabled ?? true,
  });
}
