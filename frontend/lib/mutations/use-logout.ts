"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api/auth-client";

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authClient.logout(),
    onSuccess: () => {
      // Wipe everything, not just the profile query — a logged-out session
      // shouldn't hold onto another user's cached data in memory.
      queryClient.clear();
    },
  });
}
