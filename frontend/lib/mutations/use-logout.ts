"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api/auth-client";
import { PROFILE_QUERY_KEY } from "@/lib/queries/use-profile";

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authClient.logout(),
    onSuccess: async () => {
      // Wipe everything first — a logged-out session shouldn't hold onto
      // another user's cached data in memory.
      queryClient.clear();

      // Then, last, explicitly refetch the profile query — same ordering
      // fix as useDeleteAccount. clear() only removes cached data, it
      // doesn't make Header's active useProfile() observer refetch on its
      // own; running the refetch afterward (not before) means its result
      // is what actually sticks, rather than being immediately wiped out
      // by a trailing clear().
      await queryClient.refetchQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
