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
 *
 * `data` is explicitly masked to undefined on error rather than returned
 * as-is from useQuery: TanStack Query keeps the *last successful* data
 * around even after a later fetch fails (isError/status update, data
 * doesn't) — standard library behavior, useful for "keep showing old data
 * while retrying" UIs, but wrong here. Without this, every consumer
 * checking `profile` truthiness (Header, AuthStatusBanner) kept rendering
 * the logged-in UI off stale data once a logout/account-deletion caused
 * this query to be refetched and 401, right up until something else (a
 * full page reload, which starts with no cached data at all) forced a
 * genuine reset — which is exactly why only F5 appeared to "fix" it.
 * Verified against the actual installed @tanstack/query-core source
 * before writing this, not just assumed.
 */
export function useProfile() {
  const query = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => apiClient.get<UserProfile>("/users/me"),
    retry: false,
  });

  return { ...query, data: query.isError ? undefined : query.data };
}
