"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { TicketListQuery, TicketListResponse } from "@/lib/api/types";

export const TICKETS_QUERY_KEY = ["tickets"] as const;

/**
 * The full query params are part of the cache key, not just "tickets" --
 * page 2 and page 1 (or a different sort) are genuinely different lists,
 * not the same one re-fetched.
 */
function ticketsQueryKey(query: TicketListQuery) {
  return [...TICKETS_QUERY_KEY, query] as const;
}

export function useTickets(query: TicketListQuery) {
  return useQuery({
    queryKey: ticketsQueryKey(query),
    queryFn: () =>
      apiClient.get<TicketListResponse>(
        `/tickets?${new URLSearchParams({
          page: String(query.page),
          limit: String(query.limit),
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        }).toString()}`,
      ),
    // Keeps the previous page's data on screen (instead of a spinner)
    // while the next page loads -- pagination/sort changes should feel
    // like flipping a page, not a fresh loading state each time.
    placeholderData: keepPreviousData,
  });
}
