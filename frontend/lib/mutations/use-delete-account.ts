"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { authClient } from "@/lib/api/auth-client";
import { PROFILE_QUERY_KEY } from "@/lib/queries/use-profile";
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
      // (if now orphaned) access token cookie sticks around.
      //
      // Reuses the exact route the real logout flow uses. Its backend
      // /auth/logout call may itself fail here (the user's RefreshToken
      // rows were just cascade-deleted along with the User row), but that
      // route always clears cookies regardless of the backend result — see
      // app/api/auth/logout/route.ts — so this is safe either way.
      await authClient.logout().catch(() => {});

      // Cookies alone weren't enough either: Header's useProfile() is an
      // *active*, already-mounted query observer, and queryClient.clear()
      // only removes cached data — it doesn't make an active observer
      // refetch on its own. Without this, the header kept showing the
      // stale logged-in state until something else (e.g. a hard refresh)
      // forced a fresh check. Explicitly refetching with cookies now
      // cleared gets a 401, which is what actually flips the header.
      await queryClient.refetchQueries({ queryKey: PROFILE_QUERY_KEY });

      // Now safe to wipe everything else — nothing cached against the
      // deleted account is valid.
      queryClient.clear();
    },
  });
}
