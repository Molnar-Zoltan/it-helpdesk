"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api/auth-client";
import { PROFILE_QUERY_KEY } from "@/lib/queries/use-profile";

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authClient.logout(),
    onSuccess: async () => {
      // Same ordering as useDeleteAccount, and for the same reason:
      // refetchQueries() must run before clear(), not after — clear()
      // removes the query from the cache, and refetchQueries can't find
      // (or refetch) a query that isn't there anymore. Cookies are gone
      // now, so this correctly 401s.
      await queryClient.refetchQueries({ queryKey: PROFILE_QUERY_KEY });

      // Wipe everything else — a logged-out session shouldn't hold onto
      // another user's cached data in memory.
      queryClient.clear();
    },
  });
}
