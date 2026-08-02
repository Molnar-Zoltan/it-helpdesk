"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { UserProfile } from "@/lib/api/types";

export const PROFILE_QUERY_KEY = ["profile"] as const;

/**
 * Auth state is derived from this query, not tracked separately:
 * - isLoading   -> not known yet (initial load)
 * - isError     -> logged out (the /api/backend proxy already tried a
 *                  refresh-and-retry before this 401 ever reached us)
 * - data        -> logged in; this *is* the current user
 *
 * retry: false because a 401 here is meaningful (logged out), not a
 * transient failure worth retrying — retrying would just delay the
 * logged-out UI showing up.
 */
export function useProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => apiClient.get<UserProfile>("/users/me"),
    retry: false,
  });
}
