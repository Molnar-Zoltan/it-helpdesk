"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  DeleteAccountPayload,
  DeleteAccountResponse,
} from "@/lib/api/types";

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DeleteAccountPayload) =>
      apiClient.delete<DeleteAccountResponse>("/users/me", payload),
    onSuccess: () => {
      // Same as logout: wipe everything, not just the profile query — the
      // account no longer exists, nothing cached against it is valid.
      queryClient.clear();
    },
  });
}
