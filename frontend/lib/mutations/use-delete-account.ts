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

      // Explicitly refetch the profile query BEFORE clear(), not after:
      // queryClient.refetchQueries() looks up matching queries via
      // queryCache.findAll() — if clear() already removed the query from
      // the cache, there's nothing left to find, and the call becomes a
      // no-op (verified against the installed query-core source directly,
      // not assumed). Cookies are gone now, so this correctly 401s, which
      // is what useProfile() needs to have actually happened at all —
      // nothing else triggers a refetch of an already-mounted, active
      // observer like Header's on its own.
      await queryClient.refetchQueries({ queryKey: PROFILE_QUERY_KEY });

      // Now safe to wipe everything else — nothing cached against the
      // deleted account is valid.
      queryClient.clear();
    },
  });
}
