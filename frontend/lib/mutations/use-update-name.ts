"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { PROFILE_QUERY_KEY } from "@/lib/queries/use-profile";
import type { UpdateNamePayload, UpdateNameResponse } from "@/lib/api/types";

export function useUpdateName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateNamePayload) =>
      apiClient.patch<UpdateNameResponse>("/users/me", payload),
    onSuccess: () => {
      // The header's "Signed in as {firstName}" reads useProfile() directly
      // (not a decoded token claim), so invalidating this query is all
      // that's needed for it to pick up the new name.
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
