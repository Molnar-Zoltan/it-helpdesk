"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  ChangePasswordPayload,
  ChangePasswordResponse,
} from "@/lib/api/types";

// No query invalidation on success — password isn't reflected anywhere in
// the UI (unlike name/email), and the current session stays valid: the
// backend revokes every *other* refresh token but keeps the one tied to
// this request's access token (currentRefreshTokenId), so there's no
// re-auth to trigger here.
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) =>
      apiClient.patch<ChangePasswordResponse>("/users/me/password", payload),
  });
}
