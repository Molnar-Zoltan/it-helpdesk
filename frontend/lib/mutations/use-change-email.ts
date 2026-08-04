"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { PROFILE_QUERY_KEY } from "@/lib/queries/use-profile";
import type { ChangeEmailPayload, ChangeEmailResponse } from "@/lib/api/types";

export function useChangeEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ChangeEmailPayload) =>
      apiClient.patch<ChangeEmailResponse>("/users/me/email", payload),
    onSuccess: () => {
      // The Email tab displays the current email, so unlike password this
      // needs the profile query invalidated.
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
