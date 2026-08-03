"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api/auth-client";
import { PROFILE_QUERY_KEY } from "@/lib/queries/use-profile";

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authClient.logout(),
    onSuccess: async () => {
      // queryClient.clear() only removes cached data — it doesn't make an
      // already-mounted, active observer (Header's useProfile()) refetch
      // on its own, so the header kept showing the stale logged-in state
      // until something else forced a fresh check (found while fixing the
      // identical issue on account deletion). Explicitly refetching with
      // cookies now cleared gets a 401, which is what actually flips it.
      await queryClient.refetchQueries({ queryKey: PROFILE_QUERY_KEY });

      // Wipe everything else — a logged-out session shouldn't hold onto
      // another user's cached data in memory.
      queryClient.clear();
    },
  });
}
