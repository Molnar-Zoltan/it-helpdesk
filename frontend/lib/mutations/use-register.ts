"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api/auth-client";
import { PROFILE_QUERY_KEY } from "@/lib/queries/use-profile";
import type { RegisterPayload } from "@/lib/api/types";

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authClient.register(payload),
    onSuccess: () => {
      // Cookies are already set by the route handler; refetch the profile
      // so the rest of the app picks up the new logged-in state.
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
