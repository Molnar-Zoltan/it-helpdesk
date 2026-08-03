"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { authClient } from "@/lib/api/auth-client";
import type {
  DeleteAccountPayload,
  DeleteAccountResponse,
} from "@/lib/api/types";

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DeleteAccountPayload) =>
      apiClient.delete<DeleteAccountResponse>("/users/me", payload),
    onSuccess: async () => {
      // Deleting the account doesn't clear the httpOnly session cookies —
      // that's a separate concern the backend's DELETE /users/me has no
      // reason to know about. Without this, the still-technically-valid
      // (if now orphaned) access token cookie sticks around, and the UI
      // only reflects the logged-out state after something forces a fresh
      // check (e.g. a hard refresh) rather than immediately.
      //
      // Reuses the exact route the real logout flow uses. Its backend
      // /auth/logout call may itself fail here (the user's RefreshToken
      // rows were just cascade-deleted along with the User row), but that
      // route always clears cookies regardless of the backend result — see
      // app/api/auth/logout/route.ts — so this is safe either way.
      await authClient.logout().catch(() => {});

      // Wipe everything, not just the profile query — the account no
      // longer exists, nothing cached against it is valid.
      queryClient.clear();
    },
  });
}
