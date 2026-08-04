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

      // Wipe everything first — nothing cached against the deleted
      // account is valid.
      queryClient.clear();

      // Then, last, explicitly refetch the profile query. This has to
      // come AFTER clear(), not before: clear() only removes cached
      // data, it doesn't make Header's already-mounted, active
      // useProfile() observer refetch on its own — so if this ran before
      // clear(), the freshly-fetched (now correctly logged-out) result
      // would just get wiped out again by clear() immediately after,
      // leaving the observer back in limbo. Run last, its result is what
      // actually sticks and flips the header (401, cookies are gone now).
      await queryClient.refetchQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
